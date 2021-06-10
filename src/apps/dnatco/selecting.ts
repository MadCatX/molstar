/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { BackboneAtoms, RingTypes } from './conformers';
import { StepInfo, ResidueInfo } from './steps';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { Script } from '../../mol-script/script';

export namespace Selecting {
    function reduceElemList(list: string[]) {
        return list.reduce((a, c) => a + " .`" + c + "`", '');
    }

    function conditionsToStatement(op: string, conditions: string[]) {
        if (conditions.length < 1)
            return '';
        if (conditions.length === 1)
            return conditions[0];

        let stmt: string = `(${conditions[0]})`;

        for (let i = 1; i < conditions.length - 1; i++)
            stmt = `(${op} ${stmt} (${conditions[i]}))`;

        return `${op} ${stmt} (${conditions[conditions.length - 1]})`;
    }

    function makeBackboneTest(ring: RingTypes, resno: number, isFirst: boolean, altId: string|null, insCode: string|null, ignoreDetails: boolean) {
        let conds: string[] = [];

        const dependent = reduceElemList(BackboneAtoms.ringDependent.get(ring)!);
        let atoms = reduceElemList(isFirst ? BackboneAtoms.firstResidue : BackboneAtoms.secondResidue);
        atoms += `${dependent}`;

        conds.push(`set.has (set ${atoms}) atom.label_atom_id`);
        conds.push(`= atom.resno ${resno}`);
        if (ignoreDetails === false) {
            conds.push(`= atom.altloc ${altId ? altId : '``'}`);
            conds.push(`= atom.pdbx_PDB_ins_code ${insCode ? insCode : '``'}`);
        }

        return conditionsToStatement('and', conds);
    }

    function makeBlockTest(prevStep: StepInfo|undefined, currentStep: StepInfo, nextStep: StepInfo|undefined, ignoreDetails: boolean) {
        const conds: string[] = [];

        if (prevStep !== undefined)
            conds.push(makeResidueTest(prevStep.resnoFirst, prevStep.altIdFirst, prevStep.insCodeFirst, ignoreDetails));
        conds.push(makeStepTest(currentStep, ignoreDetails));
        if (nextStep !== undefined)
            conds.push(makeResidueTest(nextStep.resnoSecond, nextStep.altIdSecond, nextStep.insCodeSecond, ignoreDetails));

        let code = conditionsToStatement('or', conds);
        return conditionsToStatement('and', [`= atom.chain \`${currentStep.asymId}\``, code]);
    }

    function makeElementTest(element: string, asymId: string, resno: number, altId: string|null, insCode: string|null) {
        let code = makeHalfStepTest(resno, altId, insCode, false);
        code = conditionsToStatement('and', [`= atom.chain \`${asymId}\``, code]);

        return conditionsToStatement('and', ['= ' + element + ' atom.label_atom_id', code]);
    }

    function makeHalfStepTest(resno: number, altId: string|null, insCode: string|null, ignoreDetails: boolean, backbone?: string) {
        let conds: string[] = [];

        conds.push(`= atom.resno ${resno}`);
        if (ignoreDetails === false) {
            conds.push(`= atom.altloc ${altId ? altId : '``'}`);
            conds.push(`= atom.pdbx_PDB_ins_code ${insCode ? insCode : '``'}`);
        }
        if (backbone)
            conds.push(backbone);

        return conditionsToStatement('and', conds);
    }

    function makeResidueTest(resno: number, altId: string|null, insCode: string|null, ignoreAltPos: boolean, ring?: RingTypes, isFirst?: boolean) {
        let backbone: string|undefined;

        if (ring)
            backbone = makeBackboneTest(ring, resno, isFirst!, altId, insCode, ignoreAltPos);

        return makeHalfStepTest(resno, altId, insCode, ignoreAltPos, backbone);
    }

    function makeResidueOtherAltPosTest(asymId: string, resno: number, altId: string) {
        let conds: string[] = [];

        conds.push(`= atom.chain \`${asymId}\``);
        conds.push(`= atom.resno ${resno}`);
        conds.push(`not (= atom.altloc ${altId})`);

        return conditionsToStatement('and', conds);
    }

    function makeStepTest(info: StepInfo, ignoreDetails: boolean, ringFirst?: RingTypes, ringSecond?: RingTypes) {
        const firstResidue = makeResidueTest(info.resnoFirst, info.altIdFirst, info.insCodeFirst, ignoreDetails, ringFirst, true);
        const secondResidue = makeResidueTest(info.resnoSecond, info.altIdSecond, info.insCodeSecond, ignoreDetails, ringSecond, false);

        return conditionsToStatement('or', [ firstResidue, secondResidue ]);
    }

    export function selectBackbone(structure: PSO.Molecule.Structure, ringFirst: RingTypes, ringSecond: RingTypes, resnoFirst: number, resnoSecond: number, asymId: string|null, altIdFirst: string|null, altIdSecond: string|null, insCodeFirst: string|null, insCodeSecond: string|null) {
        const firstResidue = makeBackboneTest(ringFirst, resnoFirst, true, altIdFirst, insCodeFirst, false);
        const secondResidue = makeBackboneTest(ringSecond, resnoSecond, false, altIdSecond, insCodeSecond, false);

        let code = conditionsToStatement('or', [firstResidue, secondResidue]);
        if (asymId) {
            code = conditionsToStatement('and', [`= atom.chain \`${asymId}\``, code]);
        }

        const scr = Script(`(sel.atom.atom-groups :atom-test (${code}))`, 'mol-script');
        return Script.toLoci(scr, structure.data);
    }

    export function residueSelectionScript(info: ResidueInfo, ring?: RingTypes, isFirst?: boolean) {
        let code = makeResidueTest(info.no, info.altId, info.insCode, false, ring, isFirst);
        code = conditionsToStatement('and', [`= atom.chain \`${info.asymId}\``, code]);

        return Script(`(sel.atom.atom-groups :atom-test (${code}))`, 'mol-script');
    }

    export function selectStepOtherAltPos(info: StepInfo) {
        const conds: string[] = [];

        if (info.altIdFirst !== null)
            conds.push(makeResidueOtherAltPosTest(info.asymId, info.resnoFirst, info.altIdFirst));
        if (info.altIdSecond !== null)
            conds.push(makeResidueOtherAltPosTest(info.asymId, info.resnoSecond, info.altIdSecond));

        if (conds.length === 0)
            return Script('', 'mol-script');

        const code = `(sel.atom.atom-groups :atom-test (${conditionsToStatement('and', conds)}))`;
        return Script(code, 'mol-script');
    }

    export function selectStep(structure: PSO.Molecule.Structure, info: StepInfo, firstRing?: RingTypes, secondRing?: RingTypes) {
        const scr = stepSelectionScript(info, firstRing, secondRing);
        return Script.toLoci(scr, structure.data);
    }

    export const SelectAllScript = Script('(sel.atom.atoms true)', 'mol-script');
    export function selectAll(structure: PSO.Molecule.Structure) {
        return Script.toLoci(SelectAllScript, structure.data);
    }

    export function selectBlock(prevStep: StepInfo|undefined, currentStep: StepInfo, nextStep: StepInfo|undefined, surroundings: number, ignoreDetails: boolean = false) {
        let code = makeBlockTest(prevStep, currentStep, nextStep, ignoreDetails);
        const entireBlock = Script.toExpression(Script(`(sel.atom.atom-groups :atom-test (${code}))`, 'mol-script'));

        if (surroundings > 0) {
            const middle = Script(`(sel.atom.atom-groups :atom-test (${makeBlockTest(undefined, currentStep, undefined, false)}))`, 'mol-script');
            const middleSurr = MS.struct.modifier.includeSurroundings(
                { 0: Script.toExpression(middle),
                    radius: surroundings,
                    'as-whole-residues': false
                }
            );
            return MS.struct.combinator.merge([entireBlock, middleSurr]);
        }
        return entireBlock;
    }

    export function selectBlockInverse(prevStep: StepInfo|undefined, currentStep: StepInfo, nextStep: StepInfo|undefined, ignoreDetails: boolean = false) {
        const code = makeBlockTest(prevStep, currentStep, nextStep, ignoreDetails);
        return Script(`(sel.atom.atom-groups :atom-test (not (${code})))`, 'mol-script');
    }

    export function stepSelectionScript(info: StepInfo, firstRing?: RingTypes, secondRing?: RingTypes) {
        let code = makeStepTest(info, false, firstRing, secondRing);
        code = conditionsToStatement('and', [`= atom.chain \`${info.asymId}\``, code]);

        return Script(`(sel.atom.atom-groups :atom-test (${code}))`, 'mol-script');
    }

    export function selectO3AndPLocis(structure: PSO.Molecule.Structure, info: StepInfo) {
        const O3 = makeElementTest("O3'", info.asymId, info.resnoFirst, info.altIdFirst, info.insCodeFirst);
        const P = makeElementTest('P', info.asymId, info.resnoSecond, info.altIdSecond, info.insCodeSecond);

        const O3Scr = Script(`(sel.atom.atom-groups :atom-test (${O3}))`, 'mol-script');
        const PScr =  Script(`(sel.atom.atom-groups :atom-test (${P}))`, 'mol-script');

        return [ Script.toLoci(O3Scr, structure.data), Script.toLoci(PScr, structure.data) ];
    }

    export function selectElementFromPyramid(structure: PSO.Molecule.Structure, element: string) {
        const code = `= ${element} atom.label_atom_id`;

        return Script(`(sel.atom.atom-groups :atom-test (${code}))`, 'mol-script');
    }

    export function selectWholePyramid(structure: PSO.Molecule.Structure, info: StepInfo) {
        const O3 = makeElementTest("O3'", info.asymId, info.resnoFirst, info.altIdFirst, info.insCodeFirst);
        const O5 = makeElementTest("O5'", info.asymId, info.resnoSecond, info.altIdSecond, info.insCodeSecond);
        const OP1 = makeElementTest('OP1', info.asymId, info.resnoSecond, info.altIdSecond, info.insCodeSecond);
        const OP2 = makeElementTest('OP2', info.asymId, info.resnoSecond, info.altIdSecond, info.insCodeSecond);
        const P = makeElementTest('P', info.asymId, info.resnoSecond, info.altIdSecond, info.insCodeSecond);

        const code = conditionsToStatement('or', [O3, O5, OP1, OP2, P]);

        return Script(`(sel.atom.atom-groups :atom-test (${code}))`, 'mol-script');
    }
}
