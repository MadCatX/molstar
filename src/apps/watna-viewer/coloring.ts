/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { Color } from '../../mol-util/color';
import * as ST from './substructure-types';

const OxygenHue = 0;
const NitrogenHue = 230;
const PhosphorusHue = 30;

const ConflictingHues = [OxygenHue, NitrogenHue, PhosphorusHue];
const MinHueDiff = 18;
const StepRandomizer = new Uint8Array(1);

function hsv2rgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

function hsvToColor(h: number, s: number, v: number) {
    const { r, g, b } = hsv2rgb(h, s, v);
    return Color.fromRgb(r, g, b);
}

function rgb2hsv(r: number, g: number, b: number) {
    const rabs = r / 255;
    const gabs = g / 255;
    const babs = b / 255;
    const v = Math.max(rabs, gabs, babs);
    const diff = v - Math.min(rabs, gabs, babs);
    const diffc = (c: number) => (v - c) / 6 / diff + 1 / 2;

    let h = 0;
    let s = 0;

    if (diff !== 0) {
        s = diff / v;
        const rr = diffc(rabs);
        const gg = diffc(gabs);
        const bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }

        if (h < 0) {
            h += 1;
        } else if (h > 1) {
            h -= 1;
        }
    }

    return { h: h * 360, s, v };
}

function randomAdvance() {
    window.crypto.getRandomValues(StepRandomizer);
    return (StepRandomizer[0] % 10) - 5;
}

export namespace Coloring {
    export function baseColor(hue: number) {
        return hsvToColor(hue, 1, 1);
    }

    export function nucleotideColor(hue: number) {
        return hsvToColor((hue + 60) % 360, 0.38, 0.75);
    }

    export function phosphateColor(hue: number) {
        return hsvToColor((hue + 30) % 360, 0.95, 0.75);
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
                const { h, v } = rgb2hsv(r, g, b);
                return hsvToColor(h, 0.15, v);
            }
            case 'water': {
                const [r, g, b] = Color.toRgb(baseColor);
                const { h, s, v } = rgb2hsv(r, g, b);
                return hsvToColor((h + 180) % 360, s, v);
            }
            default:
                return baseColor;
        }
    }
}
