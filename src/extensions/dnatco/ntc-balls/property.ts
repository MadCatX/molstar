/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 */

import { DnatcoCommon as DC } from '../common';
import { NtcBallsTypes as CBT } from './types';
import { Table } from '../../../mol-data/db';
import { CustomPropertyDescriptor } from '../../../mol-model/custom-property';
import { Model } from '../../../mol-model/structure';
import { CustomProperty } from '../../../mol-model-props/common/custom-property';
import { CustomModelProperty } from '../../../mol-model-props/common/custom-model-property';
import { PropertyWrapper } from '../../../mol-model-props/common/wrapper';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';

type NtcBalls = PropertyWrapper<CBT.DoubleBallData | undefined>;

namespace NtcBalls {
    export const Schema = DC.CifSchema;
    export type Schema = typeof Schema;

    export async function fromCif(ctx: CustomProperty.Context, model: Model, props: NtcBallsProps): Promise<CustomProperty.Data<NtcBalls>> {
        const info = PropertyWrapper.createInfo();
        const data = DC.getCifData(model);
        if (data === undefined) return { value: { info, data: undefined } };

        const fromCif = createBallsFromCif(model, data.steps, data.stepsSummary);
        return { value: { info, data: fromCif } };
    }
}

export const NtcBallsParams = {};
export type NtcBallsParams = typeof NtcBallsParams;
export type NtcBallsProps = PD.Values<NtcBallsParams>;

export const NtcBallsProvider: CustomModelProperty.Provider<NtcBallsParams, NtcBalls> = CustomModelProperty.createProvider({
    label: 'NtC Balls',
    descriptor: CustomPropertyDescriptor({
        name: 'ntc-balls',
    }),
    type: 'static',
    defaultParams: NtcBallsParams,
    getParams: (data: Model) => NtcBallsParams,
    isApplicable: (data: Model) => DC.isApplicable(data),
    obtain: async (ctx: CustomProperty.Context, data: Model, props: Partial<NtcBallsProps>) => {
        const p = { ...PD.getDefaultValues(NtcBallsParams), ...props };
        return NtcBalls.fromCif(ctx, data, p);
    }
});

type StepsSummaryTable = Table<typeof NtcBalls.Schema.ndb_struct_ntc_step_summary>;

function createBallsFromCif(model: Model,
    steps: Table<typeof NtcBalls.Schema.ndb_struct_ntc_step>,
    stepsSummary: StepsSummaryTable): CBT.DoubleBallData {
    const doubleBalls = new Array<CBT.DoubleBall>();
    const names = new Map<string, number>();
    const locations = new Array<CBT.Location>();
    let hasMultipleModels = false;

    const {
        id, PDB_model_number, name,
        auth_asym_id_1, auth_seq_id_1, label_comp_id_1, label_alt_id_1, PDB_ins_code_1,
        auth_asym_id_2, auth_seq_id_2, label_comp_id_2, label_alt_id_2, PDB_ins_code_2,
        _rowCount } = steps;

    if (_rowCount !== stepsSummary._rowCount) throw new Error('Inconsistent mmCIF data');

    for (let i = 0; i < _rowCount; i++) {
        const model_num = PDB_model_number.value(i);
        if (model_num !== model.modelNum) {
            hasMultipleModels = true;
            continue; // We are only interested in data for the current model
        }

        const { _NtC, _confal_score, _rmsd } = DC.getNtCInfo(id.value(i), i, stepsSummary);

        const doubleBall = {
            PDB_model_number: model_num,
            name: name.value(i),
            auth_asym_id_1: auth_asym_id_1.value(i),
            auth_seq_id_1: auth_seq_id_1.value(i),
            label_comp_id_1: label_comp_id_1.value(i),
            label_alt_id_1: label_alt_id_1.value(i),
            PDB_ins_code_1: PDB_ins_code_1.value(i),
            auth_asym_id_2: auth_asym_id_2.value(i),
            auth_seq_id_2: auth_seq_id_2.value(i),
            label_comp_id_2: label_comp_id_2.value(i),
            label_alt_id_2: label_alt_id_2.value(i),
            PDB_ins_code_2: PDB_ins_code_2.value(i),
            confal_score: _confal_score,
            NtC: _NtC,
            rmsd: _rmsd
        };

        doubleBalls.push(doubleBall);
        names.set(doubleBall.name, doubleBalls.length - 1);

        locations.push(CBT.Location(doubleBall, false));
        locations.push(CBT.Location(doubleBall, true));
    }

    return { doubleBalls, names, locations, hasMultipleModels };
}
