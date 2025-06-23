import { basePairLabel } from './behavior';
import { BasePairsTypes } from '../types';
import { Sphere3D } from '../../../mol-math/geometry/primitives/sphere3d';
import { DataLocation } from '../../../mol-model/location';
import { DataLoci } from '../../../mol-model/loci';

export namespace BasePairsLadderTypes {
    export interface Location extends DataLocation<{
        object: {
            kind: 'base',
            base: BasePairsTypes.BaseInPair,
        } | {
            kind: 'ball'
        },
        pair: BasePairsTypes.BasePair,
    }, {}> {}

    export function Location(object: Location['data']['object'], pair: BasePairsTypes.BasePair): Location {
        return DataLocation(BasePairsTypes.DataTag, { object, pair }, {});
    }

    export function isLocation(x: any): x is Location {
        return !!x && x.kind === 'data-location' && x.tag === BasePairsTypes.DataTag;
    }

    export interface Loci extends DataLoci<BasePairsTypes.BasePair[], number> {}

    export function Loci(data: BasePairsTypes.BasePair[], bpIndices: number[], elements: number[], boundingSphere?: Sphere3D): Loci {
        return DataLoci(
            BasePairsTypes.DataTag,
            data,
            elements,
            boundingSphere ? () => boundingSphere : undefined,
            () => bpIndices[0] !== undefined ? basePairLabel(data[bpIndices[0]]) : ''
        );
    }

    export function isLoci(x: any): x is Loci {
        return !!x && x.kind === 'data-loci' && x.tag === BasePairsTypes.DataTag;
    }
}
