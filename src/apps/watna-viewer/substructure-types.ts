/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */


export type NonNucleicType = 'protein' | 'ligand' | 'water';
export type SubstructureType = 'nucleic' | NonNucleicType;
export type SubstructureRepresentation = 'off' | 'ball-and-stick' | 'cartoon';
