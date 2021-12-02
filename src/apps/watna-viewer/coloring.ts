/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as ST from './substructure-types';
import { Colors } from '../watlas-common/colors';
import { Color } from '../../mol-util/color';

const OxygenHue = 0;
const NitrogenHue = 230;
const PhosphorusHue = 30;

const ConflictingHues = [OxygenHue, NitrogenHue, PhosphorusHue];
const MinHueDiff = 18;
const StepRandomizer = new Uint8Array(1);

function randomAdvance() {
    window.crypto.getRandomValues(StepRandomizer);
    return (StepRandomizer[0] % 10) - 5;
}

export namespace Coloring {
    export function baseColor(hue: number) {
        return Colors.hsvToColor(hue, 1, 1);
    }

    export function nucleotideColor(hue: number) {
        return Colors.hsvToColor((hue + 60) % 360, 0.38, 0.75);
    }

    export function phosphateColor(hue: number) {
        return Colors.hsvToColor((hue + 30) % 360, 0.95, 0.75);
    }

    /* https://alienryderflex.com/hsp.html */
    export function luminance(color: Color) {
        let [r, g, b] = Color.toRgb(color);
        r /= 255.0;
        g /= 255.0;
        b /= 255.0;
        return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    }

    export function nextHue(hue: number) {
        window.crypto.getRandomValues(StepRandomizer);
        const advance = 77 + randomAdvance();
        const newHue = (hue + advance) % 360;

        for (const conflicting of ConflictingHues) {
            let diff = Math.abs(conflicting - newHue) % 360;
            if (diff > 180)
                diff = 360 - diff;
            if (diff < MinHueDiff) {
                return (newHue + 2 * MinHueDiff) % 360;
            }
        }

        return newHue;
    }

    export function nonNucleicColor(type: ST.NonNucleicType, baseColor: Color) {
        switch (type) {
            case 'protein': {
                const [r, g, b] = Color.toRgb(baseColor);
                const { h, v } = Colors.rgb2hsv(r, g, b);
                return Colors.hsvToColor(h, 0.15, v);
            }
            case 'water': {
                const [r, g, b] = Color.toRgb(baseColor);
                const { h, s, v } = Colors.rgb2hsv(r, g, b);
                return Colors.hsvToColor((h + 180) % 360, s, v);
            }
            default:
                return baseColor;
        }
    }
}
