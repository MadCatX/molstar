/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { StructureElement } from '../../mol-model/structure';
import { OrderedSet, SortedArray } from '../../mol-data/int';

export namespace StepSlider {
    function move(loci: StructureElement.Loci, moveBy: number) {
        const lociElement = loci.elements[0];
        const lociIndices = lociElement.indices;
        const unitElements = lociElement.unit.elements;
        const { index: residueIndex, offsets: residueOffsets } = lociElement.unit.model.atomicHierarchy.residueAtomSegments;
        const eICurrent = unitElements[OrderedSet.getAt(lociIndices, 0)];
        const rICurrent = residueIndex[eICurrent];
        let rITarget = rICurrent + moveBy;

        if (rITarget >= residueIndex.length - 1)
            rITarget = residueIndex.length - 1;
        else if (rITarget < 0)
            rITarget = 0;

        const { label_alt_id } = lociElement.unit.model.atomicHierarchy.atoms;
        const firstAltId = label_alt_id.value(eICurrent);

        let i = OrderedSet.indexOf(lociElement.unit.elements, eICurrent);
        let _eI = eICurrent;
        let _rI = rICurrent;
        while (_rI !== rITarget) {
            _eI = unitElements[i];
            _rI = residueIndex[_eI];

            i++;

            if (_eI === undefined)
                return undefined;
        }
        let _rIEnd = _rI + 2 >= residueIndex.length ? residueIndex.length - 1 : _rI + 2;


        const newIndices: StructureElement.UnitIndex[] = [];
        for (let j = residueOffsets[_rI], _j = residueOffsets[_rIEnd]; j < _j; j++) {
            const idx = OrderedSet.indexOf(unitElements, j);
            if (idx >= 0) {
                const altId = label_alt_id.value(j);
                if (firstAltId === '' || altId === firstAltId || altId === '') {
                    newIndices[newIndices.length] = idx as StructureElement.UnitIndex;
                }
            }
        }

        let newElements: StructureElement.Loci['elements'][0][] = [];
        newElements[newElements.length] = { unit: lociElement.unit, indices: SortedArray.ofSortedArray(newIndices) };

        return StructureElement.Loci(loci.structure, newElements);
    }

    export function forward(loci: StructureElement.Loci): StructureElement.Loci | undefined {
        return move(loci, 1);
    }

    export function secondResidueLocation(loci: StructureElement.Loci): StructureElement.Location | undefined {
        const lociElement = loci.elements[0];
        const lociIndices = lociElement.indices;
        const unitElements = lociElement.unit.elements;
        const { index: residueIndex } = lociElement.unit.model.atomicHierarchy.residueAtomSegments;
        const eICurrent = unitElements[OrderedSet.getAt(lociIndices, 0)];
        const rICurrent = residueIndex[eICurrent];
        let rITarget = rICurrent + 1;

        let i = 0;
        let _eI = eICurrent;
        let _rI = rICurrent;
        while (_rI !== rITarget) {
            _eI = unitElements[OrderedSet.getAt(lociIndices, i)];
            _rI = residueIndex[_eI];
            i++;

            if (_eI === undefined)
                return undefined;
        }

        return StructureElement.Location.create(loci.structure, loci.elements[0].unit, _eI);
    }
}
