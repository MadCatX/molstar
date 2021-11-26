/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

export namespace Resources {
    export type DensityMapPaths = {
        base: string,
        nucleotide: string,
        phosphate: string,
    }
    export type StructurePaths = {
        reference: string,
        base: string,
        nucleotide: string,
        phosphate: string,
    }
    export type Paths = {
        root: string,
        structures: StructurePaths,
        densityMaps: DensityMapPaths,
    }
    export type Structures = keyof StructurePaths;
    export type DensityMaps = keyof DensityMapPaths;
    export type AllKinds = Structures | DensityMaps;
    export type Type = 'structure' | 'density-map';

    export function makeLinks(paths: Paths) {
        const links: { url: string, kind: AllKinds, type: Type }[] = [];

        for (const k in paths.structures) {
            const key = k as Structures;
            const url = `${paths.root}/${paths.structures[key]}`;
            links.push({ url, kind: key, type: 'structure' });
        }

        for (const k in paths.densityMaps) {
            const key = k as DensityMaps;
            const url = `${paths.root}/${paths.densityMaps[key]}`;
            links.push({ url, kind: key, type: 'density-map' });
        }

        return links;
    }
}
