import { BasePairsTypes } from './types';
import { Column, Table } from '../../mol-data/db';
import { toTable } from '../../mol-io/reader/cif/schema';
import { CustomProperty } from '../../mol-model-props/common/custom-property';
import { PropertyWrapper } from '../../mol-model-props/common/wrapper';
import { Model } from '../../mol-model/structure';
import { MmcifFormat } from '../../mol-model-formats/structure/mmcif';
import { ParamDefinition as PD } from '../../mol-util/param-definition';

export type Pairings = PropertyWrapper<{} | undefined>;

export const BasePairsParams = {};
export type BasePairsParams = typeof BasePairsParams;
export type BasePairsProps = PD.Values<BasePairsParams>;

export namespace BasePairs {
    export const Schema = {
        ndb_base_pair_list: {
            base_pair_id: Column.Schema.int,
            PDB_model_number: Column.Schema.int,
            asym_id_1: Column.Schema.str,
            entity_id_1: Column.Schema.int,
            seq_id_1: Column.Schema.int,
            comp_id_1: Column.Schema.str,
            PDB_ins_code_1: Column.Schema.str,
            alt_id_1: Column.Schema.str,
            struct_oper_id_1: Column.Schema.str,
            asym_id_2: Column.Schema.str,
            entity_id_2: Column.Schema.int,
            seq_id_2: Column.Schema.int,
            comp_id_2: Column.Schema.str,
            PDB_ins_code_2: Column.Schema.str,
            alt_id_2: Column.Schema.str,
            struct_oper_id_2: Column.Schema.str,
        },
        ndb_base_pair_annotation: {
            id: Column.Schema.int,
            base_pair_id: Column.Schema.int,
            orientation: Column.Schema.str,
            base_1_edge: Column.Schema.str,
            base_2_edge: Column.Schema.str,
            'l-w_family_num': Column.Schema.int,
            'l-w_family': Column.Schema.str,
            class: Column.Schema.str,
            subclass: Column.Schema.str,
        },
    };
    export type Schema = typeof Schema;

    export function getBasePairsFromCif(
        annotation: Table<typeof BasePairs.Schema.ndb_base_pair_annotation>,
        list: Table<typeof BasePairs.Schema.ndb_base_pair_list>
    ) {
        const basePairs = new Array<BasePairsTypes.BasePair>();
        const mapByModel = new Array<BasePairsTypes.MappedChains>();

        const { _rowCount: annotation_row_count } = annotation;
        const { _rowCount: list_row_count } = list;

        if (annotation_row_count !== list_row_count) throw new Error('Inconsistent mmCIF data');

        for (let i = 0; i < annotation_row_count; i++) {
            const bp = getBasePair(i, annotation, list);
            basePairs.push(bp);

            const modelIdx = bp.PDB_model_number - 1;
            if (mapByModel.length < modelIdx || !mapByModel[modelIdx]) {
                mapByModel[modelIdx] = new Map<string, BasePairsTypes.MappedResidues>();
            }

            const mapByChains = mapByModel[modelIdx];

            // We need to do this symmetrically for both residues
            {
                const residuesOnChain = mapByChains.get(bp.asym_id_1) ?? new Map<number, number>();
                if (!!residuesOnChain.get(bp.seq_id_1)) throw new Error(`Multiple Base Pairs defined for model ${bp.PDB_model_number}, asym_id ${bp.asym_id_1}, seq_id ${bp.seq_id_1}`);

                residuesOnChain.set(bp.seq_id_1, basePairs.length - 1);
            }
            {
                const residuesOnChain = mapByChains.get(bp.asym_id_2) ?? new Map<number, number>();
                if (!!residuesOnChain.get(bp.seq_id_2)) throw new Error(`Multiple Base Pairs defined for model ${bp.PDB_model_number}, asym_id ${bp.asym_id_2}, seq_id ${bp.seq_id_2}`);

                residuesOnChain.set(bp.seq_id_2, basePairs.length - 1);
            }
        }

        return { basePairs, mapByModel };
    }

    export function getCifData(model: Model) {
        if (!MmcifFormat.is(model.sourceData)) throw new Error('Data format must be mmCIF');
        if (!hasNdbBasePairsNtcCategories(model)) return undefined;
        return {
            annotations: toTable(Schema.ndb_base_pair_annotation, model.sourceData.data.frame.categories.ndb_base_pair_annotation),
            list: toTable(Schema.ndb_base_pair_list, model.sourceData.data.frame.categories.ndb_base_pair_list),
        };
    }

    export async function fromCif(ctx: CustomProperty.Context, model: Model, props: BasePairsProps): Promise<CustomProperty.Data<Pairings>> {
        const info = PropertyWrapper.createInfo();
        const data = getCifData(model);
        if (!data) return { value: { info, data: void 0 } };

        const fromCif = getBasePairsFromCif(data.annotations, data.list);
        return { value: { info, data: fromCif } };
    }

    export function isApplicable(model?: Model) {
        return !!model && hasNdbBasePairsNtcCategories(model);
    }

    function hasNdbBasePairsNtcCategories(model: Model) {
        if (!MmcifFormat.is(model.sourceData)) return false;
        const names = (model.sourceData).data.frame.categoryNames;
        return names.includes('ndb_base_pair_list') && names.includes('ndb_base_pair_annotation');
    }
}

function intoBaseEdge(edge: string) {
    edge = edge.toLowerCase();
    if (edge === 'watson-crick') return 'watson-crick';
    else if (edge === 'hoogsteen') return 'hoogsteen';
    else if (edge === 'sugar') return 'sugar';

    throw new Error(`Unknown base edge ${edge}`);
}

function intoOrientation(os: string) {
    const o = os[0];
    if (o === 'c') return 'cis';
    else if (o === 'w') return 'trans';

    throw new Error(`Unknown orientation ${o}`);
}

function getBasePair(
    index: number,
    annotation: Table<typeof BasePairs.Schema.ndb_base_pair_annotation>,
    list: Table<typeof BasePairs.Schema.ndb_base_pair_list>
): BasePairsTypes.BasePair {
    const base_pair_id = annotation.base_pair_id.value(index);
    let listIndex = -1;
    for (let r = 0; r < list._rowCount; r++) {
        if (list.base_pair_id.value(r) === base_pair_id) {
            listIndex = r;
            break;
        }
    }
    if (listIndex === -1) throw new Error(`base_pair_id ${base_pair_id} not present in ndb_base_pair_list table`);

    return {
        PDB_model_number: list.PDB_model_number.value(listIndex),
        asym_id_1: list.asym_id_1.value(listIndex),
        entity_id_1: list.entity_id_1.value(listIndex),
        seq_id_1: list.seq_id_1.value(listIndex),
        comp_id_1: list.comp_id_1.value(listIndex),
        PDB_ins_code_1: list.PDB_ins_code_1.value(listIndex),
        alt_id_1: list.alt_id_1.value(listIndex),
        struct_oper_id_1: list.struct_oper_id_1.value(listIndex),
        asym_id_2: list.asym_id_2.value(listIndex),
        entity_id_2: list.entity_id_2.value(listIndex),
        seq_id_2: list.seq_id_2.value(listIndex),
        comp_id_2: list.comp_id_2.value(listIndex),
        PDB_ins_code_2: list.PDB_ins_code_2.value(listIndex),
        alt_id_2: list.alt_id_2.value(listIndex),
        struct_oper_id_2: list.struct_oper_id_2.value(listIndex),
        orientation: intoOrientation(annotation.orientation.value(index)),
        base_edge_1: intoBaseEdge(annotation.base_1_edge.value(index)),
        base_edge_2: intoBaseEdge(annotation.base_2_edge.value(index)),
    };
}
