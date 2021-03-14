/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

export namespace Identifiers {
    export const BaseModel: string = 'base-model';
    export const Model: string = 'model';
    export const Properties: string = 'properties';
    export const SCE: string = 'structure-complex-element';
    export const Structure: string = 'structure';
    export const Substructure: string = 'substructure';
    export const Transformation: string = 'transformation';
    export const Transparency: string = 'transparency';
    export const Visual: string = 'visual';

    export const Balls: string = 'balls';
    export const Confal: string = 'confal';
    export const DensityFile: string = 'density-file';
    export const DensityData: string = 'density-data';
    export const DensityDifference: string = 'density-difference';
    export const DensityMap: string = 'density-map';
    export const DensityMapVisual: string = 'density-map-visual';
    export const DensityNegDifVisual: string = 'density-negdif-visual';
    export const DensityPosDifVisual: string = 'density-posdif-visual';
    export const Focus: string = 'focus';
    export const Hetero: string = 'hetero';
    export const NextSuperposed: string = 'next-superposed';
    export const NotSelected: string = 'not-selected';
    export const OtherAltPos: string = 'other-alt-pos';
    export const PreviousSuperposed: string = 'previous-superposed';
    export const Protein: string = 'protein';
    export const Pyramid: string = 'pyramid';
    export const Selected: string = 'selected';
    export const Superposed: string = 'superposed';
    export const Water: string = 'water';

    export function mkRef(base: string, tag?: string) {
        if (!tag)
            return base;
        else
            return `${base}_${tag}`;
    }
}
