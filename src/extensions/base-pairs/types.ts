export namespace BasePairsTypes {
    export const DataTag = 'base-pairs-base-in-pair';

    export type Item = UnpairedResidue | BasePair;

    export type BaseEdge = 'watson-crick' | 'hoogsteen' | 'sugar';
    export type UnpairedResidue = {
        kind: 'unpaired',
        PDB_model_number: number,
        residue: {
            asym_id: string,
            entity_id: string,
            seq_id: number,
            comp_id: string,
            PDB_ins_code: string,
            alt_id: string,
        }
    };
    export type BasePair = {
        kind: 'pair',
        PDB_model_number: number,
        orientation: 'cis' | 'trans',
        a: Base,
        b: Base,
        is_complementary: boolean,
    };

    export interface Items {
        items: Item[],
    }

    export interface Base {
        asym_id: string,
        entity_id: string,
        seq_id: number,
        comp_id: string,
        PDB_ins_code: string,
        alt_id: string,
        struct_oper_id: string,
        base_edge: BaseEdge,
    }
}
