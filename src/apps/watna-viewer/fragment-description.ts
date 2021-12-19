/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { Resources } from './resources';
import * as ST from './substructure-types';
import { Color } from '../../mol-util/color';

export type Range<T> = { min: T, max: T };

export namespace FragmentDescription {
    export type ColorTheme = 'element-symbol' | 'uniform';
    export type OffRepresentation = 'off';
    export type StructureRepresentation = 'ball-and-stick' | 'cartoon';
    export type MapRepresentation = 'solid' | 'wireframe' | 'both';

    export type DensityMap = {
        representation: MapRepresentation | OffRepresentation;
        iso: number;
        isoRange: Range<number>;
    }

    export type Structure = {
        representation: StructureRepresentation | OffRepresentation;
    }

    export type Coloring = {
        color: Color;
        theme: ColorTheme;
    }

    export interface Description {
        fragId: string;
        referenceName: { text: string; transform: boolean };
        structures: Map<Resources.Structures, Map<ST.SubstructureType, Structure>>;
        densityMaps: Map<Resources.DensityMaps, DensityMap>;
        colors: Map<Resources.AllKinds, Map<ST.SubstructureType, Coloring>>;
    }
}
