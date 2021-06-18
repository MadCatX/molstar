/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

export type NtC = string;
export type Sequence = string;

export namespace Resources {
    export type Structures = 'reference' | 'base' | 'step' | 'phos';
    export type DensityMaps = 'base' | 'step' | 'phos';
    export type AllKinds = Structures | DensityMaps;
    export type Type = 'structure' | 'density-map';

    function baseLink(ntc: NtC, seq: Sequence) {
        return `./data`;
    }

    function mapKind(kind: AllKinds) {
        switch (kind) {
            case 'step':
                return 'dinu';
            default:
                return kind;
        }
    }

    function structSuffix(stru: Structures) {
        switch (stru) {
            case 'reference':
                return 'scale';
            default:
                return 'waterpeaks';
        }
    }

    export function makeLinks(ntc: NtC, seq: Sequence) {
        const links: { url: string, kind: AllKinds, type: Type }[] = [];

        ([ 'reference' , 'base' , 'step' , 'phos' ] as AllKinds[]).forEach(kind => {
            const prefix = `${ntc}_${seq}`;
            if (isStructure(kind)) {
                const url = `${baseLink(ntc, seq)}/${prefix}_${mapKind(kind)}_${structSuffix(kind)}.pdb`
                links.push({ url, kind, type: 'structure' });
            }
            if (isDensityMap(kind)) {
                const url = `${baseLink(ntc, seq)}/${prefix}_${mapKind(kind)}_water.map.ccp4`;
                links.push({ url, kind, type: 'density-map' });
            }
        });

        return links;
    }

    export function isDensityMap(kind: AllKinds): kind is DensityMaps {
        return kind === 'base' ||
               kind === 'step' ||
               kind === 'phos';
    }

    export function isStructure(kind: AllKinds): kind is Structures {
        return kind === 'reference' ||
               kind === 'base' ||
               kind === 'step' ||
               kind === 'phos';
    }
}
