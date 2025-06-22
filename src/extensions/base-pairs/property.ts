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
    export async function fromCif(ctx: CustomProperty.Context, model: Model, props: BasePairsProps): Promise<CustomProperty.Data<Pairings>> {
        const info = PropertyWrapper.createInfo();

        return { value: { info, data: {} } };
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
