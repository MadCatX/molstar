/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 */

import { NtcBallsProvider } from './property';
import { NtcBallsTypes as CBT } from './types';
import { DnatcoCommon as DC } from '../common';
import { Location } from '../../../mol-model/location';
import { CustomProperty } from '../../../mol-model-props/common/custom-property';
import { ColorTheme } from '../../../mol-theme/color';
import { ThemeDataContext } from '../../../mol-theme/theme';
import { Color } from '../../../mol-util/color';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';

const Description = 'Assigns colors to NtC balls';
const ErrorColor = Color(0xFFA10A);

export const NtcBallsColorThemeParams = {
    // AA
    AA00U: PD.Color(DC.AColor),
    AA00L: PD.Color(DC.AColor),

    AA01U: PD.Color(DC.AColor),
    AA01L: PD.Color(DC.AColor),

    AA02U: PD.Color(DC.AColor),
    AA02L: PD.Color(DC.AColor),

    AA03U: PD.Color(DC.AColor),
    AA03L: PD.Color(DC.AColor),

    AA04U: PD.Color(DC.AColor),
    AA04L: PD.Color(DC.AColor),

    AA05U: PD.Color(DC.AColor),
    AA05L: PD.Color(DC.AColor),

    AA06U: PD.Color(DC.AColor),
    AA06L: PD.Color(DC.AColor),

    AA07U: PD.Color(DC.AColor),
    AA07L: PD.Color(DC.AColor),

    AA08U: PD.Color(DC.AColor),
    AA08L: PD.Color(DC.AColor),

    AA09U: PD.Color(DC.AColor),
    AA09L: PD.Color(DC.AColor),

    AA10U: PD.Color(DC.AColor),
    AA10L: PD.Color(DC.AColor),

    AA11U: PD.Color(DC.AColor),
    AA11L: PD.Color(DC.AColor),

    AA12U: PD.Color(DC.AColor),
    AA12L: PD.Color(DC.AColor),

    AA13U: PD.Color(DC.AColor),
    AA13L: PD.Color(DC.AColor),

    // AB
    AB01U: PD.Color(DC.AColor),
    AB01L: PD.Color(DC.BColor),

    AB02U: PD.Color(DC.AColor),
    AB02L: PD.Color(DC.BColor),

    AB03U: PD.Color(DC.AColor),
    AB03L: PD.Color(DC.BColor),

    AB04U: PD.Color(DC.AColor),
    AB04L: PD.Color(DC.BColor),

    AB05U: PD.Color(DC.AColor),
    AB05L: PD.Color(DC.BColor),

    // BA
    BA01U: PD.Color(DC.BColor),
    BA01L: PD.Color(DC.AColor),

    BA05U: PD.Color(DC.BColor),
    BA05L: PD.Color(DC.AColor),

    BA08U: PD.Color(DC.BIIColor),
    BA08L: PD.Color(DC.AColor),

    BA09U: PD.Color(DC.BColor),
    BA09L: PD.Color(DC.AColor),

    BA10U: PD.Color(DC.BColor),
    BA10L: PD.Color(DC.AColor),

    BA13U: PD.Color(DC.BIIColor),
    BA13L: PD.Color(DC.AColor),

    BA16U: PD.Color(DC.BIIColor),
    BA16L: PD.Color(DC.AColor),

    BA17U: PD.Color(DC.BIIColor),
    BA17L: PD.Color(DC.AColor),

    // BB
    BB00U: PD.Color(DC.BColor),
    BB00L: PD.Color(DC.BColor),

    BB01U: PD.Color(DC.BColor),
    BB01L: PD.Color(DC.BColor),

    BB02U: PD.Color(DC.BColor),
    BB02L: PD.Color(DC.BColor),

    BB03U: PD.Color(DC.BColor),
    BB03L: PD.Color(DC.BColor),

    BB04U: PD.Color(DC.BColor),
    BB04L: PD.Color(DC.BIIColor),

    BB05U: PD.Color(DC.BColor),
    BB05L: PD.Color(DC.BIIColor),

    BB07U: PD.Color(DC.BIIColor),
    BB07L: PD.Color(DC.BIIColor),

    BB08U: PD.Color(DC.BIIColor),
    BB08L: PD.Color(DC.BIIColor),

    BB10U: PD.Color(DC.miBColor),
    BB10L: PD.Color(DC.miBColor),

    BB11U: PD.Color(DC.BColor),
    BB11L: PD.Color(DC.BColor),

    BB12U: PD.Color(DC.miBColor),
    BB12L: PD.Color(DC.miBColor),

    BB13U: PD.Color(DC.miBColor),
    BB13L: PD.Color(DC.miBColor),

    BB16U: PD.Color(DC.BColor),
    BB16L: PD.Color(DC.BColor),

    BB14U: PD.Color(DC.miBColor),
    BB14L: PD.Color(DC.miBColor),

    BB15U: PD.Color(DC.miBColor),
    BB15L: PD.Color(DC.miBColor),

    BB17U: PD.Color(DC.BColor),
    BB17L: PD.Color(DC.BColor),

    BB20U: PD.Color(DC.miBColor),
    BB20L: PD.Color(DC.miBColor),

    // IC
    IC01U: PD.Color(DC.ICColor),
    IC01L: PD.Color(DC.ICColor),

    IC02U: PD.Color(DC.ICColor),
    IC02L: PD.Color(DC.ICColor),

    IC03U: PD.Color(DC.ICColor),
    IC03L: PD.Color(DC.ICColor),

    IC04U: PD.Color(DC.ICColor),
    IC04L: PD.Color(DC.ICColor),

    IC05U: PD.Color(DC.ICColor),
    IC05L: PD.Color(DC.ICColor),

    IC06U: PD.Color(DC.ICColor),
    IC06L: PD.Color(DC.ICColor),

    IC07U: PD.Color(DC.ICColor),
    IC07L: PD.Color(DC.ICColor),

    // OP
    OP01U: PD.Color(DC.OPNColor),
    OP01L: PD.Color(DC.OPNColor),

    OP02U: PD.Color(DC.OPNColor),
    OP02L: PD.Color(DC.OPNColor),

    OP03U: PD.Color(DC.OPNColor),
    OP03L: PD.Color(DC.OPNColor),

    OP04U: PD.Color(DC.OPNColor),
    OP04L: PD.Color(DC.OPNColor),

    OP05U: PD.Color(DC.OPNColor),
    OP05L: PD.Color(DC.OPNColor),

    OP06U: PD.Color(DC.OPNColor),
    OP06L: PD.Color(DC.OPNColor),

    OP07U: PD.Color(DC.OPNColor),
    OP07L: PD.Color(DC.OPNColor),

    OP08U: PD.Color(DC.OPNColor),
    OP08L: PD.Color(DC.OPNColor),

    OP09U: PD.Color(DC.OPNColor),
    OP09L: PD.Color(DC.OPNColor),

    OP10U: PD.Color(DC.OPNColor),
    OP10L: PD.Color(DC.OPNColor),

    OP11U: PD.Color(DC.OPNColor),
    OP11L: PD.Color(DC.OPNColor),

    OP12U: PD.Color(DC.OPNColor),
    OP12L: PD.Color(DC.OPNColor),

    OP13U: PD.Color(DC.OPNColor),
    OP13L: PD.Color(DC.OPNColor),

    OP14U: PD.Color(DC.OPNColor),
    OP14L: PD.Color(DC.OPNColor),

    OP15U: PD.Color(DC.OPNColor),
    OP15L: PD.Color(DC.OPNColor),

    OP16U: PD.Color(DC.OPNColor),
    OP16L: PD.Color(DC.OPNColor),

    OP17U: PD.Color(DC.OPNColor),
    OP17L: PD.Color(DC.OPNColor),

    OP18U: PD.Color(DC.OPNColor),
    OP18L: PD.Color(DC.OPNColor),

    OP19U: PD.Color(DC.OPNColor),
    OP19L: PD.Color(DC.OPNColor),

    OP20U: PD.Color(DC.OPNColor),
    OP20L: PD.Color(DC.OPNColor),

    OP21U: PD.Color(DC.OPNColor),
    OP21L: PD.Color(DC.OPNColor),

    OP22U: PD.Color(DC.OPNColor),
    OP22L: PD.Color(DC.OPNColor),

    OP23U: PD.Color(DC.OPNColor),
    OP23L: PD.Color(DC.OPNColor),

    OP24U: PD.Color(DC.OPNColor),
    OP24L: PD.Color(DC.OPNColor),

    OP25U: PD.Color(DC.OPNColor),
    OP25L: PD.Color(DC.OPNColor),

    OP26U: PD.Color(DC.OPNColor),
    OP26L: PD.Color(DC.OPNColor),

    OP27U: PD.Color(DC.OPNColor),
    OP27L: PD.Color(DC.OPNColor),

    OP28U: PD.Color(DC.OPNColor),
    OP28L: PD.Color(DC.OPNColor),

    OP29U: PD.Color(DC.OPNColor),
    OP29L: PD.Color(DC.OPNColor),

    OP30U: PD.Color(DC.OPNColor),
    OP30L: PD.Color(DC.OPNColor),

    OP31U: PD.Color(DC.OPNColor),
    OP31L: PD.Color(DC.OPNColor),

    // SYN
    OPS1U: PD.Color(DC.SYNColor),
    OPS1L: PD.Color(DC.OPNColor),

    OP1SU: PD.Color(DC.OPNColor),
    OP1SL: PD.Color(DC.SYNColor),

    AAS1U: PD.Color(DC.SYNColor),
    AAS1L: PD.Color(DC.AColor),

    AB1SU: PD.Color(DC.AColor),
    AB1SL: PD.Color(DC.SYNColor),

    AB2SU: PD.Color(DC.AColor),
    AB2SL: PD.Color(DC.SYNColor),

    BB1SU: PD.Color(DC.BColor),
    BB1SL: PD.Color(DC.SYNColor),

    BB2SU: PD.Color(DC.BColor),
    BB2SL: PD.Color(DC.SYNColor),

    BBS1U: PD.Color(DC.SYNColor),
    BBS1L: PD.Color(DC.BColor),

    ZZ1SU: PD.Color(DC.ZColor),
    ZZ1SL: PD.Color(DC.SYNColor),

    ZZ2SU: PD.Color(DC.ZColor),
    ZZ2SL: PD.Color(DC.SYNColor),

    ZZS1U: PD.Color(DC.SYNColor),
    ZZS1L: PD.Color(DC.ZColor),

    ZZS2U: PD.Color(DC.SYNColor),
    ZZS2L: PD.Color(DC.ZColor),

    // ZZ
    ZZ01U: PD.Color(DC.ZColor),
    ZZ01L: PD.Color(DC.ZColor),

    ZZ02U: PD.Color(DC.ZColor),
    ZZ02L: PD.Color(DC.ZColor),

    // N
    NANTU: PD.Color(DC.NColor),
    NANTL: PD.Color(DC.NColor),
};

export type NtcBallsColorThemeParams = typeof NtcBallsColorThemeParams;
export function getNtcBallsColorThemeParams(ctx: ThemeDataContext) {
    return PD.clone(NtcBallsColorThemeParams);
}

function getBallColor(NtC: string, isC5: boolean, props: PD.Values<NtcBallsColorThemeParams>) {
    const key = NtC + (isC5 ? 'L' : 'U');
    if (!props.hasOwnProperty(key))
        throw new Error(`Invalid ball key ${key}`);

    return props[key as keyof NtcBallsColorThemeParams];
}

export function NtcBallsColorTheme(ctx: ThemeDataContext, props: PD.Values<NtcBallsColorThemeParams>): ColorTheme<NtcBallsColorThemeParams> {
    function color(location: Location, isSecondary: boolean): Color {
        if (CBT.isLocation(location)) {
            const { doubleBall, isC5 } = location.data;
            return getBallColor(doubleBall.NtC, isC5, props);
        }

        return ErrorColor;
    }

    return {
        factory: NtcBallsColorTheme,
        granularity: 'group',
        color,
        props,
        description: Description,
    };
}

export const NtcBallsColorThemeProvider: ColorTheme.Provider<NtcBallsColorThemeParams, 'ntc-balls'> = {
    name: 'ntc-balls',
    label: 'NtC Balls',
    category: ColorTheme.Category.Residue,
    factory: NtcBallsColorTheme,
    getParams: getNtcBallsColorThemeParams,
    defaultValues: PD.getDefaultValues(NtcBallsColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => !!ctx.structure && ctx.structure.models.some(m => DC.isApplicable(m)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => data.structure ? NtcBallsProvider.attach(ctx, data.structure.models[0], void 0, true) : Promise.resolve(),
        detach: (data) => data.structure && data.structure.models[0].customProperties.reference(NtcBallsProvider.descriptor, false)
    }
};
