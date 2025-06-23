import { BasePairsLadderProvider } from './property';
import { BasePairsLadderTypes } from './types';
import { BasePairs } from '../property';
import { Location } from '../../../mol-model/location';
import { CustomProperty } from '../../../mol-model-props/common/custom-property';
import { ColorTheme } from '../../../mol-theme/color';
import { ColorThemeCategory } from '../../../mol-theme/color/categories';
import { ThemeDataContext } from '../../../mol-theme/theme';
import { Color, ColorMap } from '../../../mol-util/color';
import { getColorMapParams } from '../../../mol-util/color/params';
import { TableLegend } from '../../../mol-util/legend';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { ObjectKeys } from '../../../mol-util/type-helpers';

const DefaultColor = Color(0xFFAAFF);
const ErrorColor = Color(0xFFA10A);

const LadderColors = ColorMap({
    'Hoogsteen': Color(0x0F0FCD),
    'Sugar': Color(0xFF0000),
    'WW_Standard': Color(0x6BED00),
    'WW_Non_Standard': Color(0xFFFF00),
    'Cis_Ball': Color(0xFAFAFA),
    'Trans_Ball': Color(0x363636),
    Default: DefaultColor,
});

const StandardBases = ['A', 'C', 'G', 'U', 'DA', 'DC', 'DG', 'DT'];

export const BasePairsLadderColorThemeParams = {
    colors: PD.MappedStatic('default', {
        default: PD.EmptyGroup(),
        custom: PD.Group(getColorMapParams(LadderColors)),
    }),
};
export type BasePairsLadderColorThemeParams = typeof BasePairsLadderColorThemeParams;

export function getBasePairsLadderColorThemeParams(ctx: ThemeDataContext) {
    return PD.clone(BasePairsLadderColorThemeParams);
}

export function BasePairsLadderColorTheme(ctx: ThemeDataContext, props: PD.Values<BasePairsLadderColorThemeParams>): ColorTheme<BasePairsLadderColorThemeParams> {
    const colorMap = props.colors.name === 'default' ? LadderColors : props.colors.params;

    function color(location: Location, isSecondary: boolean): Color {
        if (BasePairsLadderTypes.isLocation(location)) {
            const { object, pair } = location.data;

            if (object.kind === 'base') {
                const { base } = object;
                if (base.base_edge === 'watson-crick') {
                    if (StandardBases.includes(pair.a.comp_id) && StandardBases.includes(pair.b.comp_id)) {
                        return colorMap.WW_Standard;
                    } else {
                        return colorMap.WW_Non_Standard;
                    }
                } else if (base.base_edge === 'hoogsteen') return colorMap.Hoogsteen;
                else if (base.base_edge === 'sugar') return colorMap.Sugar;
            } else {
                if (pair.orientation === 'cis') return colorMap.Cis_Ball;
                else return colorMap.Trans_Ball;
            }

            return colorMap.Default;
        } else {
            return DefaultColor;
        }
    }

    return {
        factory: BasePairsLadderColorTheme,
        granularity: 'group',
        color,
        props,
        description: 'Assigns colors to Base Pairs Ladder steps',
        legend: TableLegend(ObjectKeys(colorMap).map(k => [k, colorMap[k]] as [string, Color]).concat([['Error', ErrorColor]])),
    };
}

export const BasePairsLadderColorThemeProvider: ColorTheme.Provider<BasePairsLadderColorThemeParams, 'base-pairs-ladder'> = {
    name: 'base-pairs-ladder',
    label: 'Base Pairs Ladder',
    category: ColorThemeCategory.Residue,
    factory: BasePairsLadderColorTheme,
    getParams: getBasePairsLadderColorThemeParams,
    defaultValues: PD.getDefaultValues(BasePairsLadderColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => !!ctx.structure && ctx.structure.models.some(m => BasePairs.isApplicable(m)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => data.structure ? BasePairsLadderProvider.attach(ctx, data.structure.models[0], void 0, true) : Promise.resolve(),
        detach: (data) => data.structure && BasePairsLadderProvider.ref(data.structure.models[0], false)
    }
};
