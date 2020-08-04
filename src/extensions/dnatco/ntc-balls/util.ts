/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 */

import { NtcBallsProvider } from './property';
import { NtcBallsTypes as CBT } from './types';
import { OrderedSet, Segmentation } from '../../../mol-data/int';
import { Vec3 } from '../../../mol-math/linear-algebra';
import { ChainIndex, ElementIndex, ResidueIndex, Structure, StructureElement, StructureProperties, Unit } from '../../../mol-model/structure';

export namespace NtcBallsUtil {
    type Residue = Segmentation.Segment<ResidueIndex>;

    export type AtomInfo = {
        pos: Vec3,
        index: ElementIndex,
        fakeAltId: string,
    };

    type ResidueInfo = {
        PDB_model_num: number,
        asym_id: string,
        auth_asym_id: string,
        seq_id: number,
        auth_seq_id: number,
        comp_id: string,
        alt_id: string,
        ins_code: string,
    };

    export type Handler = (doubleBall: CBT.DoubleBall, O3: AtomInfo, C5: AtomInfo, firstLocIndex: number, secondLocIndex: number) => void;

    function residueInfoFromLocation(loc: StructureElement.Location): ResidueInfo {
        return {
            PDB_model_num: StructureProperties.unit.model_num(loc),
            asym_id: StructureProperties.chain.label_asym_id(loc),
            auth_asym_id: StructureProperties.chain.auth_asym_id(loc),
            seq_id: StructureProperties.residue.label_seq_id(loc),
            auth_seq_id: StructureProperties.residue.auth_seq_id(loc),
            comp_id: StructureProperties.atom.label_comp_id(loc),
            alt_id: StructureProperties.atom.label_alt_id(loc),
            ins_code: StructureProperties.residue.pdbx_PDB_ins_code(loc)
        };
    }

    export function hasMultipleModels(unit: Unit.Atomic): boolean {
        const prop = NtcBallsProvider.get(unit.model).value;
        if (prop === undefined || prop.data === undefined) throw new Error('No custom properties data');
        return prop.data.hasMultipleModels;
    }

    function getPossibleAltIdsIndices(eIFirst: ElementIndex, eILast: ElementIndex, structure: Structure, unit: Unit.Atomic): string[] {
        const loc = StructureElement.Location.create(structure, unit, -1 as ElementIndex);

        const uIFirst = OrderedSet.indexOf(unit.elements, eIFirst);
        const uILast = OrderedSet.indexOf(unit.elements, eILast);

        const possibleAltIds: string[] = [];
        for (let uI = uIFirst; uI <= uILast; uI++) {
            loc.element = unit.elements[uI];
            const altId = StructureProperties.atom.label_alt_id(loc);
            if (altId !== '' && !possibleAltIds.includes(altId)) possibleAltIds.push(altId);
        }

        return possibleAltIds;
    }

    function getPossibleAltIdsResidue(residue: Residue, structure: Structure, unit: Unit.Atomic): string[] {
        return getPossibleAltIdsIndices(unit.elements[residue.start], unit.elements[residue.end - 1], structure, unit);
    }

    class Utility {
        protected getDoubleBallByName(name: string): { doubleBall: CBT.DoubleBall | undefined, index: number } {
            const index = this.data.names.get(name);
            if (index === undefined) return { doubleBall: undefined, index: -1 };

            return { doubleBall: this.data.doubleBalls[index], index };
        }

        protected stepToName(entry_id: string, modelNum: number, locFirst: StructureElement.Location, locSecond: StructureElement.Location, fakeAltId_1: string, fakeAltId_2: string) {
            const first = residueInfoFromLocation(locFirst);
            const second = residueInfoFromLocation(locSecond);
            const model_id = this.hasMultipleModels ? `-m${modelNum}` : '';
            const alt_id_1 =  fakeAltId_1 !== '' ? `.${fakeAltId_1}` : (first.alt_id.length ? `.${first.alt_id}` : '');
            const alt_id_2 = fakeAltId_2 !== '' ? `.${fakeAltId_2}` : (second.alt_id.length ? `.${second.alt_id}` : '');
            const ins_code_1 = first.ins_code.length ? `.${first.ins_code}` : '';
            const ins_code_2 = second.ins_code.length ? `.${second.ins_code}` : '';

            return `${entry_id}${model_id}_${first.auth_asym_id}_${first.comp_id}${alt_id_1}_${first.auth_seq_id}${ins_code_1}_${second.comp_id}${alt_id_2}_${second.auth_seq_id}${ins_code_2}`;
        }

        constructor(unit: Unit.Atomic) {
            const prop = NtcBallsProvider.get(unit.model).value;
            if (prop === undefined || prop.data === undefined) throw new Error('No custom properties data');

            this.data = prop.data;
            this.hasMultipleModels = hasMultipleModels(unit);

            this.entryId = unit.model.entryId.toLowerCase();
            this.modelNum = unit.model.modelNum;
        }

        protected readonly data: CBT.DoubleBallData
        protected readonly hasMultipleModels: boolean;
        protected readonly entryId: string;
        protected readonly modelNum: number;
    }

    export class UnitWalker extends Utility {
        private getAtomIndices(names: string[], residue: Residue): ElementIndex[] {
            let rI = residue.start;
            const rILast = residue.end - 1;
            const indices: ElementIndex[] = [];

            for (; rI !== rILast; rI++) {
                const eI = this.unit.elements[rI];
                const loc = StructureElement.Location.create(this.structure, this.unit, eI);
                const thisName = StructureProperties.atom.label_atom_id(loc);
                if (names.includes(thisName)) indices.push(eI);
            }

            if (indices.length === 0)
                throw new Error(`Element ${name} not found on residue ${residue.index}`);

            return indices;
        }

        private getAtomPositions(indices: ElementIndex[]): Vec3[] {
            const pos = this.unit.conformation.invariantPosition;
            const positions: Vec3[] = [];

            for (const eI of indices) {
                const v = Vec3.zero();
                pos(eI, v);
                positions.push(v);
            }

            return positions;
        }

        private handleStep(O3s: AtomInfo[], C5s: AtomInfo[]) {
            const modelNum = this.hasMultipleModels ? this.modelNum : -1;
            let ok = false;

            const firstLoc = StructureElement.Location.create(this.structure, this.unit, -1 as ElementIndex);
            const secondLoc = StructureElement.Location.create(this.structure, this.unit, -1 as ElementIndex);
            for (let i = 0; i < O3s.length; i++) {
                const O3 = O3s[i];
                for (let j = 0; j < C5s.length; j++) {
                    const C5 = C5s[j];
                    firstLoc.element = O3.index;
                    secondLoc.element = C5.index;

                    const name = this.stepToName(this.entryId, modelNum, firstLoc, secondLoc, O3.fakeAltId, C5.fakeAltId);
                    const { doubleBall, index } = this.getDoubleBallByName(name);
                    if (doubleBall !== undefined) {
                        const setLoc = (loc: CBT.Location, eI: ElementIndex) => {
                            loc.element.structure = this.structure;
                            loc.element.unit = this.unit;
                            loc.element.element = eI;
                        };

                        const locIndex = index * 2;
                        setLoc(this.data.locations[locIndex], firstLoc.element);
                        setLoc(this.data.locations[locIndex + 1], secondLoc.element);
                        this.handler(doubleBall, O3, C5, locIndex, locIndex + 1);
                        ok = true;
                    }
                }
            }

            if (!ok) throw new Error('Bogus step');
        }

        private processFirstResidue(residue: Residue, possibleAltIds: string[]) {
            const indO3 = this.getAtomIndices(['O3\'', 'O3*'], residue);
            const posO3 = this.getAtomPositions(indO3);

            const infoO3: AtomInfo[] = [
                { pos: posO3[0], index: indO3[0], fakeAltId: '' }
            ];

            for (let i = 1; i < indO3.length; i++) {
                infoO3.push({ pos: posO3[i], index: indO3[i], fakeAltId: '' });
            }

            if (infoO3.length === 1 && possibleAltIds.length > 1) {
                /* We have some alternate positions on the residue but O3 does not have any - fake them */
                infoO3[0].fakeAltId = possibleAltIds[0];

                for (let i = 1; i < possibleAltIds.length; i++)
                    infoO3.push({ pos: posO3[0], index: indO3[0], fakeAltId: possibleAltIds[i] });
            }

            return infoO3;
        }

        private processSecondResidue(residue: Residue, possibleAltIds: string[]) {
            const indC5 = this.getAtomIndices(['C5\'', 'C5*'], residue);
            const posC5 = this.getAtomPositions(indC5);

            const infoC5: AtomInfo[] = [];
            if (indC5.length === 1 && possibleAltIds.length > 1) {
                /* No altIds on OP1, fake them */
                for (const altId of possibleAltIds)
                    infoC5.push({ pos: posC5[0], index: indC5[0], fakeAltId: altId });
            } else {
                for (let i = 0; i < indC5.length; i++)
                    infoC5.push({ pos: posC5[i], index: indC5[i], fakeAltId: '' });
            }

            return infoC5;
        }

        private step(residue: Residue): { O3s: AtomInfo[], C5s: AtomInfo[] } {
            const O3sPossibleAltIds = getPossibleAltIdsResidue(residue, this.structure, this.unit);
            const O3s = this.processFirstResidue(residue, O3sPossibleAltIds);

            residue = this.residueIt.move();

            const C5sPossibleAltIds = getPossibleAltIdsResidue(residue, this.structure, this.unit);
            const C5s = this.processSecondResidue(residue, C5sPossibleAltIds);

            return { O3s, C5s };
        }

        walk() {
            while (this.chainIt.hasNext) {
                this.residueIt.setSegment(this.chainIt.move());

                let residue = this.residueIt.move();
                while (this.residueIt.hasNext) {
                    try {
                        const { O3s, C5s } = this.step(residue);

                        this.handleStep(O3s, C5s);
                    } catch (error) {
                        /* Skip and move along */
                        residue = this.residueIt.move();
                    }
                }
            }
        }

        constructor(private structure: Structure, private unit: Unit.Atomic, private handler: Handler) {
            super(unit);

            this.chainIt = Segmentation.transientSegments(unit.model.atomicHierarchy.chainAtomSegments, unit.elements);
            this.residueIt = Segmentation.transientSegments(unit.model.atomicHierarchy.residueAtomSegments, unit.elements);
        }

        private chainIt: Segmentation.SegmentIterator<ChainIndex>;
        private residueIt: Segmentation.SegmentIterator<ResidueIndex>;
    }
}
