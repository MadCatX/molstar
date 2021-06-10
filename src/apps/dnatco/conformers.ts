/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

export type RingTypes = 'purine' | 'pyrimidine';

export type Compounds =
    'A' | 'G' | 'DA' | 'DG' | 'DDG' | 'EDA' | 'GNE' | 'N2G' | 'N5I' | '2DA' | '7DA' |
    'PRN' | 'AD2' | 'A3P' | 'A5L' | 'FMG' | 'MA7' | 'MG1' | 'O2G' | 'PPW' | '1AP' | '2FI' |
    '2PR' | '6MA' | '6OG' | '7GU' | '8OG' | 'TGP' | 'GFL' | 'A2M' | 'OMG' | 'GTP' | 'GDP' | '2MG' |
    'G7M' | 'IGU' | '6NW' | 'T' | 'C' | 'U' | 'DT' | '2DT' | '5NC' | 'DC' | 'DU' | 'BRU' | 'CBR' | 'C38' |
    'DOC' | 'ME6' | 'OMC' | 'UMP' | 'Z' | '5CM' | '5IU' | '5PY' | 'PST' | 'SPT' | 'TPC' | 'TSP' | 'UPS' |
    'US1' | '4PC' | '5HU' | '5FC' | 'UFT' | 'CFL' | 'TAF' | '5HC' | 'CCC' | 'IMC' | '5BU' | '6OO' | 'F2T' | 'XFC';

export type References =
    'AA00' | 'AA01' | 'AA02' | 'AA03' | 'AA04' | 'AA05' | 'AA06' | 'AA07' | 'AA08' | 'AA09' | 'AA10' | 'AA11' | 'AA12' | 'AA13' | 'AAS1' |
    'AB01' | 'AB1S' | 'AB02' | 'AB2S' | 'AB03' | 'AB04' | 'AB05' |
    'BA01' | 'BA05' | 'BA08' | 'BA09' | 'BA10' | 'BA13' | 'BA16' | 'BA17' |
    'BB00' | 'BB01' | 'BB1S' | 'BB02' | 'BB2S' | 'BB03' | 'BB04' | 'BB05' | 'BB07' | 'BB08' | 'BB10' | 'BB11' | 'BB12' | 'BB13' | 'BB14' | 'BB15' | 'BB16' | 'BB17' | 'BB20' | 'BBS1' |
    'IC01' | 'IC02' | 'IC03' | 'IC04' | 'IC05' | 'IC06' | 'IC07' |
    'OP01' | 'OP1S' | 'OP02' | 'OP03' | 'OP04' | 'OP05' | 'OP06' | 'OP07' | 'OP08' | 'OP09' | 'OP10' | 'OP11' | 'OP12' | 'OP13' | 'OP14' | 'OP15' | 'OP16' | 'OP17' | 'OP18' | 'OP19' | 'OP20' | 'OP21' | 'OP22' | 'OP23' | 'OP24' | 'OP25' | 'OP26' | 'OP27' | 'OP28' | 'OP29' | 'OP30' | 'OP31' | 'OPS1' |
    'ZZ01' | 'ZZ1S' | 'ZZ02' | 'ZZ2S' | 'ZZS1' | 'ZZS2';

export const referenceSequences: Map<References, Compounds[]> = new Map([
    ['AA00', [ 'A',  'G']],
    ['AA01', ['DC', 'DG']],
    ['AA02', ['DA', 'DA']],
    ['AA03', [ 'U',  'C']],
    ['AA04', [ 'A',  'G']],
    ['AA05', [ 'A',  'G']],
    ['AA06', [ 'U',  'G']],
    ['AA07', [ 'U',  'A']],
    ['AA08', [ 'G',  'C']],
    ['AA09', [ 'A',  'A']],
    ['AA10', [ 'A',  'G']],
    ['AA11', [ 'A',  'A']],
    ['AA12', [ 'U',  'G']],
    ['AA13', [ 'G',  'U']],
    ['AB01', ['DC', 'DG']],
    ['AB02', ['DG', 'DG']],
    ['AB03', ['DC', 'DA']],
    ['AB04', ['DT', 'DA']],
    ['AB05', [ 'G',  'U']],
    ['BA01', ['DA', 'DT']],
    ['BA05', ['DA', 'DC']],
    ['BA09', ['DG', 'DG']],
    ['BA08', ['DC', 'DG']],
    ['BA10', ['DA', 'DG']],
    ['BA13', ['DG', 'DA']],
    ['BA16', [ 'U',  'U']],
    ['BA17', ['DC', 'DT']],
    ['BB00', ['DG', 'DA']],
    ['BB01', ['DA', 'DA']],
    ['BB17', ['DC', 'DC']],
    ['BB02', ['DA', 'DC']],
    ['BB03', ['DA', 'DG']],
    ['BB11', ['DT', 'DT']],
    ['BB16', ['DC', 'DG']],
    ['BB04', ['DC', 'DG']],
    ['BB05', ['DA', 'DC']],
    ['BB07', ['DC', 'DG']],
    ['BB08', ['DC', 'DG']],
    ['BB10', ['DG', 'DG']],
    ['BB12', ['DG', 'DA']],
    ['BB13', ['DA', 'DC']],
    ['BB14', ['DC', 'DA']],
    ['BB15', ['DG', 'DC']],
    ['BB20', ['DT', 'DT']],
    ['IC01', [ 'C',  'C']],
    ['IC02', [ 'U',  'U']],
    ['IC03', [ 'G',  'A']],
    ['IC04', ['DC', 'DG']],
    ['IC05', ['DC', 'DG']],
    ['IC06', ['DC', 'DG']],
    ['IC07', [ 'G',  'U']],
    ['OP01', [ 'C',  'A']],
    ['OP02', [ 'G',  'U']],
    ['OP03', [ 'G',  'A']],
    ['OP04', [ 'G',  'A']],
    ['OP05', [ 'G',  'U']],
    ['OP06', [ 'U',  'U']],
    ['OP07', [ 'G',  'C']],
    ['OP08', [ 'G',  'A']],
    ['OP09', [ 'U',  'U']],
    ['OP10', [ 'G',  'A']],
    ['OP11', [ 'A',  'G']],
    ['OP12', [ 'U',  'C']],
    ['OP13', [ 'U',  'G']],
    ['OP14', [ 'A',  'G']],
    ['OP15', [ 'G',  'U']],
    ['OP16', [ 'G',  'G']],
    ['OP17', [ 'G',  'U']],
    ['OP18', [ 'U',  'U']],
    ['OP19', ['DG', 'DT']],
    ['OP20', ['DA', 'DC']],
    ['OP21', [ 'U',  'U']],
    ['OP22', ['DU', 'DU']],
    ['OP23', [ 'A',  'G']],
    ['OP24', [ 'A',  'A']],
    ['OP25', [ 'A',  'U']],
    ['OP26', [ 'U',  'C']],
    ['OP27', [ 'C',  'G']],
    ['OP28', [ 'G',  'U']],
    ['OP29', [ 'A',  'U']],
    ['OP30', [ 'C',  'G']],
    ['OP31', [ 'A',  'G']],
    ['OPS1', [ 'U',  'C']],
    ['OP1S', ['DT', 'DG']],
    ['AAS1', [ 'C',  'A']],
    ['AB1S', ['DA', 'DG']],
    ['AB2S', [ 'G',  'G']],
    ['BB1S', ['DG', 'DG']],
    ['BB2S', ['DG', 'DG']],
    ['BBS1', ['DG', 'DG']],
    ['ZZ01', [ 'U',  'C']],
    ['ZZ02', [ 'A',  'C']],
    ['ZZ1S', ['DC', 'DG']],
    ['ZZ2S', ['DC', 'DG']],
    ['ZZS1', ['DG', 'DC']],
    ['ZZS2', ['DG', 'DC']],
]);

export const compoundRingTypes: Map<Compounds, RingTypes> = new Map([
    [  'A', 'purine'],
    [  'G', 'purine'],
    [ 'DA', 'purine'],
    [ 'DG', 'purine'],
    ['DDG', 'purine'],
    ['EDA', 'purine'],
    ['GNE', 'purine'],
    ['N2G', 'purine'],
    ['N5I', 'purine'],
    ['2DA', 'purine'],
    ['7DA', 'purine'],
    ['PRN', 'purine'],
    ['AD2', 'purine'],
    ['A3P', 'purine'],
    ['A5L', 'purine'],
    ['FMG', 'purine'],
    ['MA7', 'purine'],
    ['MG1', 'purine'],
    ['O2G', 'purine'],
    ['PPW', 'purine'],
    ['1AP', 'purine'],
    ['2FI', 'purine'],
    ['2PR', 'purine'],
    ['6MA', 'purine'],
    ['6OG', 'purine'],
    ['7GU', 'purine'],
    ['8OG', 'purine'],
    ['TGP', 'purine'],
    ['GFL', 'purine'],
    ['A2M', 'purine'],
    ['OMG', 'purine'],
    ['GTP', 'purine'],
    ['GDP', 'purine'],
    ['2MG', 'purine'],
    ['G7M', 'purine'],
    ['IGU', 'purine'],
    ['6NW', 'purine'],
    [  'T', 'pyrimidine'],
    [  'C', 'pyrimidine'],
    [  'U', 'pyrimidine'],
    [ 'DT', 'pyrimidine'],
    ['2DT', 'pyrimidine'],
    ['5NC', 'pyrimidine'],
    [ 'DC', 'pyrimidine'],
    [ 'DU', 'pyrimidine'],
    ['BRU', 'pyrimidine'],
    ['CBR', 'pyrimidine'],
    ['C38', 'pyrimidine'],
    ['DOC', 'pyrimidine'],
    ['ME6', 'pyrimidine'],
    ['OMC', 'pyrimidine'],
    ['UMP', 'pyrimidine'],
    [  'Z', 'pyrimidine'],
    ['5CM', 'pyrimidine'],
    ['5IU', 'pyrimidine'],
    ['5PY', 'pyrimidine'],
    ['PST', 'pyrimidine'],
    ['SPT', 'pyrimidine'],
    ['TPC', 'pyrimidine'],
    ['TSP', 'pyrimidine'],
    ['UPS', 'pyrimidine'],
    ['US1', 'pyrimidine'],
    ['4PC', 'pyrimidine'],
    ['5HU', 'pyrimidine'],
    ['5FC', 'pyrimidine'],
    ['UFT', 'pyrimidine'],
    ['CFL', 'pyrimidine'],
    ['TAF', 'pyrimidine'],
    ['5HC', 'pyrimidine'],
    ['CCC', 'pyrimidine'],
    ['IMC', 'pyrimidine'],
    ['5BU', 'pyrimidine'],
    ['6OO', 'pyrimidine'],
    ['F2T', 'pyrimidine'],
    ['XFC', 'pyrimidine']
]);

export namespace BackboneAtoms {
    export const firstResidue = [ "C5'", "C4'", "O4'", "C3'", "O3'", "C1'" ];
    export const secondResidue = [ "P", "O5'", "C5'", "C4'", "O4'", "C3'", "O3'", "C1'" ];
    export const ringDependent: Map<RingTypes, string[]> = new Map([
        ['purine', [ 'N9',  'C4' ] ],
        ['pyrimidine', [ 'N1',  'C2' ] ]
    ]);
}

export namespace Util {
    export function referenceRingTypes(reference: References): RingTypes[] {
        const refComps = referenceSequences.get(reference)!;
        return [compoundRingTypes.get(refComps[0])!, compoundRingTypes.get(refComps[1])!];
    }
}
