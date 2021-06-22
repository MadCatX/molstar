/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

export type NtC =
    'AA00' | 'AA02' | 'AA03' | 'AA04' | 'AA08' | 'AA09' | 'AA01' | 'AA05' | 'AA06' | 'AA10' | 'AA11' | 'AA07' | 'AA12' | 'AA13' |
    'AB01' | 'AB02' | 'AB03' | 'AB04' | 'AB05' | 'BA01' | 'BA05' | 'BA09' | 'BA08' | 'BA10' | 'BA13' | 'BA16' | 'BA17' |
    'BB00' | 'BB01' | 'BB17' | 'BB02' | 'BB03'| 'BB11' | 'BB16' | 'BB04' | 'BB05' | 'BB07' | 'BB08' | 'BB10' | 'BB12' | 'BB13' | 'BB14' | 'BB15' | 'BB20' |
    'IC01' | 'IC02' | 'IC03' | 'IC04' | 'IC05' | 'IC06' | 'IC07' |
    'OP01' | 'OP02' | 'OP03' | 'OP04' | 'OP05' | 'OP06' | 'OP07' | 'OP08' | 'OP09' | 'OP10' | 'OP11' | 'OP12' | 'OP13' | 'OP14' | 'OP15' | 'OP16' | 'OP17' | 'OP18' | 'OP19' | 'OP20' | 'OP21' | 'OP22' | 'OP23' | 'OP24' | 'OP25' | 'OP26' | 'OP27' | 'OP28' | 'OP29' | 'OP30' | 'OP31' | 'OPS1' | 'OP1S' |
    'AAS1' | 'AB1S' | 'AB2S' |
    'BB1S' | 'BB2S' | 'BBS1' |
    'ZZ01' | 'ZZ02' | 'ZZ1S' | 'ZZ2S' | 'ZZS1' | 'ZZS2';
export type Sequence =
    'A_A' | 'A_C' | 'A_G' | 'A_T' |
    'C_A' | 'C_C' | 'C_G' | 'C_T' |
    'G_A' | 'G_C' | 'G_G' | 'G_T' |
    'T_A' | 'T_C' | 'T_G' | 'T_T';

export namespace Resources {
    export type Structures = 'reference' | 'base' | 'step' | 'phos';
    export type DensityMaps = 'base' | 'step' | 'phos';
    export type AllKinds = Structures | DensityMaps;
    export type Type = 'structure' | 'density-map';

    function baseLink(ntc: NtC, seq: Sequence) {
        return `./data/${ntc}/${seq}`;
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
