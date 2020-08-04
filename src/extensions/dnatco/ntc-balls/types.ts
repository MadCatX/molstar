/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 */

import { DnatcoCommon as DC } from '../common';
import { DataLocation } from '../../../mol-model/location';
import { ElementIndex, Structure, StructureElement, Unit } from '../../../mol-model/structure';

export namespace NtcBallsTypes {
    export type DoubleBall = DC.NtCObject;

    export interface DoubleBallData {
        doubleBalls: Array<DoubleBall>,
        names: Map<string, number>;
        locations: Array<Location>,
        hasMultipleModels: boolean
    }

    export interface LocationData {
        readonly doubleBall: DoubleBall;
        readonly isC5: boolean;
    }

    export interface Element {
        structure: Structure;
        unit: Unit.Atomic;
        element: ElementIndex;
    }

    export interface Location extends DataLocation<LocationData, Element> {}

    export function Location(doubleBall: DoubleBall, isC5: boolean, structure?: Structure, unit?: Unit.Atomic, element?: ElementIndex) {
        return DataLocation('double-ball', { doubleBall, isC5 }, { structure: structure as any, unit: unit as any, element: element as any });
    }

    export function isLocation(x: any): x is Location {
        return !!x && x.kind === 'data-location' && x.tag === 'double-ball';
    }

    export function toElementLocation(location: Location) {
        return StructureElement.Location.create(location.element.structure, location.element.unit, location.element.element);
    }
}
