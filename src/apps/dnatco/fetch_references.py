#! /usr/bin/env python3

import requests
import sys

references = [
    'AA00',
    'AA01',
    'AA02',
    'AA03',
    'AA04',
    'AA05',
    'AA06',
    'AA07',
    'AA08',
    'AA09',
    'AA10',
    'AA11',
    'AA12',
    'AA13',
    'AB01',
    'AB02',
    'AB03',
    'AB04',
    'AB05',
    'BA01',
    'BA05',
    'BA09',
    'BA08',
    'BA10',
    'BA13',
    'BA16',
    'BA17',
    'BB00',
    'BB01',
    'BB17',
    'BB02',
    'BB03',
    'BB11',
    'BB16',
    'BB04',
    'BB05',
    'BB07',
    'BB08',
    'BB10',
    'BB12',
    'BB13',
    'BB14',
    'BB15',
    'BB20',
    'IC01',
    'IC02',
    'IC03',
    'IC04',
    'IC05',
    'IC06',
    'IC07',
    'OP01',
    'OP02',
    'OP03',
    'OP04',
    'OP05',
    'OP06',
    'OP07',
    'OP08',
    'OP09',
    'OP10',
    'OP11',
    'OP12',
    'OP13',
    'OP14',
    'OP15',
    'OP16',
    'OP17',
    'OP18',
    'OP19',
    'OP20',
    'OP21',
    'OP22',
    'OP23',
    'OP24',
    'OP25',
    'OP26',
    'OP27',
    'OP28',
    'OP29',
    'OP30',
    'OP31',
    'OPS1',
    'OP1S',
    'AAS1',
    'AB1S',
    'AB2S',
    'BB1S',
    'BB2S',
    'BBS1',
    'ZZ01',
    'ZZ02',
    'ZZ1S',
    'ZZ2S',
    'ZZS1',
    'ZZS2'
]

def fetch_reference_pdbs():
    reference_pdbs = {}

    for ref in references:
        print('Fetching ' + ref + '...')
        r = requests.get('https://blackbox.ibt.biocev.org/devel_molstar/references/' + ref + '.pdb')
        if r.status_code != 200:
            raise Exception('Failed to fetch reference conformer ' + ref)
        
        reference_pdbs[ref] = r.text
        
    return reference_pdbs

def references_to_ts(reference_pdbs):
    out = "import { References } from './conformers'\n\n";
    out += 'export namespace ReferencePdbs {\n'
    out += 'export type Map = Record<References, string>;\n'
    out += 'export const data = {\n'
    for ref, pdb in reference_pdbs.items():
        out += "'{}': `{}`,\n".format(ref, pdb)

    out += '};\n'
    out += '}'

    return out

def main():
    if (len(sys.argv) < 2):
        raise Exception('Invalid arguments')

    reference_pdbs = fetch_reference_pdbs()
    ts = references_to_ts(reference_pdbs)

    fh = open(sys.argv[1], 'w')
    fh.write(ts)

if __name__ == '__main__':
    main()
    
    
