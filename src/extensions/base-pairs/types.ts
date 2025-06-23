export namespace BasePairsTypes {
    export const DataTag = 'base-pairs-base-in-pair';

    export type BaseEdge = 'watson-crick' | 'hoogsteen' | 'sugar';
    export type BasePair = {
        PDB_model_number: number,
        orientation: 'cis' | 'trans',
        a: BaseInPair,
        b: BaseInPair,
    };

    export interface BasePairs {
        basePairs: BasePair[],
    }

    export interface BaseInPair {
        asym_id: string,
        entity_id: number,
        seq_id: number,
        comp_id: string,
        PDB_ins_code: string,
        alt_id: string,
        struct_oper_id: string
        base_edge: BaseEdge,
    }
}
