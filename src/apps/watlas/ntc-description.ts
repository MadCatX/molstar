/**
 */

import { NtC, Resources, Sequence } from './resources';
import { Color } from '../../mol-util/color';

export type Range<T> = { min: T, max : T };

export namespace NtCDescription {
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
        ntc: NtC;
        seq: Sequence;
        structures: Map<Resources.Structures, Structure>;
        densityMaps: Map<Resources.DensityMaps, DensityMap>;
        colors: Map<Resources.AllKinds, Color>;
    }
}
