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
    export type MapStyle = 'solid' | 'wireframe' | 'both';

    export type DensityMap = {
        shown: boolean;
        iso: number;
        isoRange: Range<number>;
        style: MapStyle;
    };

    export type Structure = {
        shown: boolean;
    }

    export interface Description {
        fragId: string;
        referenceName: { text: string; transform: boolean };
        structures: Map<Resources.Structures, Structure>;
        densityMaps: Map<Resources.DensityMaps, DensityMap>;
        colors: Map<Resources.AllKinds, Color>;
        extraStructurePartsRepresentations: Map<ST.NonNucleicType, ST.SubstructureRepresentation | null>;
    }
}
