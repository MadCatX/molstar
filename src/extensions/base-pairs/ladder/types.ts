import { BasePairsTypes } from '../types';
import { DataLocation } from '../../../mol-model/location';

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
}
