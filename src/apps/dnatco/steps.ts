/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { Compounds } from './conformers';
import { StepSlider } from './stepslider';
import { Util } from './util';
import { StructureElement, StructureProperties } from '../../mol-model/structure';

export type WhichResidue = 'first' | 'second';

export class ResidueInfo {
    asymId: string;
    no: number;
    altId: string | null;
    insCode: string | null;
    modelIndex: number;
}

export class StepInfo {
    asymId: string;
    compoundFirst: Compounds;
    compoundSecond: Compounds;
    resnoFirst: number;
    resnoSecond: number;
    altIdFirst: string | null;
    altIdSecond: string | null;
    insCodeFirst: string | null;
    insCodeSecond: string | null;
    modelIndex: number;
}

export namespace Steps {
    function getCompoundAndAltId(piece: string): [Compounds, string|null] {
        const segments = piece.split('.');

        if (segments.length < 1 || segments.length > 2)
            throw new Error('Invalid compound/altId piece');

        const comp = segments[0] as Compounds;

        if (segments.length !== 2)
            return [comp, null];

        return [comp, segments[1]];
    }

    function getInsertionCode(piece: string) {
        const segments = piece.split('.');

        if (segments.length === 2)
            return segments[1];

        return null;
    }

    function getPdbxModelNum(piece: string): number {
        const segments = piece.split('-');

        switch (segments.length) {
            case 1:
                return 1;
            case 2:
                const ret = parseInt(segments[1].substring(1));
                if (isNaN(ret)) {
                    return 1;
                }
                return ret;
            default:
                throw new Error(`Invalid model piece ${piece}`);
        }
    }

    function getResidueNumber(piece: string): number {
        return parseInt(piece.split('.')[0]);
    }

    export function getResidueInfo(info: StepInfo, which: WhichResidue): ResidueInfo {
        return {
            asymId: info.asymId,
            no: which === 'first' ? info.resnoFirst : info.resnoSecond,
            altId: which === 'first' ? info.altIdFirst : info.altIdSecond,
            insCode: which === 'first' ? info.insCodeFirst : info.insCodeSecond,
            modelIndex: info.modelIndex
        };
    }

    export function lociToStepInfo(loci: StructureElement.Loci): StepInfo {
        const loc = Util.lociToLocation(loci);
        const locNext = Util.lociToLocation(StepSlider.nextResidue(loci)!);

        const asymId = StructureProperties.chain.auth_asym_id(loc);
        const compoundFirst = StructureProperties.atom.auth_comp_id(loc) as Compounds;
        const compoundSecond = locNext ? StructureProperties.atom.auth_comp_id(locNext) as Compounds : compoundFirst;
        const resnoFirst = StructureProperties.residue.auth_seq_id(loc);
        const resnoSecond = locNext ? StructureProperties.residue.auth_seq_id(locNext) : resnoFirst;
        const altIdFirst = StructureProperties.atom.label_alt_id(loc);
        const altIdSecond = locNext ? StructureProperties.atom.label_alt_id(locNext) : altIdFirst;
        const insCodeFirst = StructureProperties.residue.pdbx_PDB_ins_code(loc);
        const insCodeSecond = locNext ? StructureProperties.residue.pdbx_PDB_ins_code(locNext) : insCodeFirst;
        const modelIndex = StructureProperties.unit.model_num(loc);

        return {
            asymId,
            compoundFirst, compoundSecond,
            resnoFirst, resnoSecond,
            altIdFirst, altIdSecond,
            insCodeFirst, insCodeSecond,
            modelIndex
        };
    }

    export function makeStepInfo(stepId: string): StepInfo {
        const segments = stepId.split('_');
        if (segments.length !== 6)
            throw new Error(`Invalid step id format: ${stepId}`);

        const asymId = segments[1];
        const [compoundFirst, altIdFirst] = getCompoundAndAltId(segments[2]);
        const [compoundSecond, altIdSecond] = getCompoundAndAltId(segments[4]);
        const resnoFirst = getResidueNumber(segments[3]);
        const resnoSecond = getResidueNumber(segments[5]);
        const modelIndex = getPdbxModelNum(segments[0]) - 1;
        const insCodeFirst = getInsertionCode(segments[3]);
        const insCodeSecond = getInsertionCode(segments[5]);

        return {
            asymId,
            compoundFirst, compoundSecond,
            resnoFirst, resnoSecond,
            altIdFirst, altIdSecond,
            insCodeFirst, insCodeSecond,
            modelIndex
        };
    }
}
