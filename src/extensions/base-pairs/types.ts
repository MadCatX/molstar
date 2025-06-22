export namespace BasePairsTypes {
    export type BaseEdge = 'watson-crick' | 'hoogsteen' | 'sugar';
    export type BasePair = {
        PDB_model_number: number,
        asym_id_1: string,
        entity_id_1: number,
        seq_id_1: number,
        comp_id_1: string,
        PDB_ins_code_1: string,
        alt_id_1: string,
        struct_oper_id_1: string
        asym_id_2: string,
        entity_id_2: number,
        seq_id_2: number,
        comp_id_2: string,
        PDB_ins_code_2: string,
        alt_id_2: string,
        struct_oper_id_2: string,
        base_edge_1: BaseEdge,
        base_edge_2: BaseEdge,
        orientation: 'cis' | 'trans',
    }

    export type MappedChains = Map<string, MappedResidues>;
    export type MappedResidues = Map<number, number>; // Residue number -> index into the "basePairs" array

    export interface BasePairs {
        basePairs: BasePair[],
        mapping: MappedChains[],
    }
}
