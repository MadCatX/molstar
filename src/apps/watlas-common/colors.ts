/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { Color } from '../../mol-util/color';

function ntxs(num: number) {
    num = Math.round(num);
    const str = num.toString(16);
    return num < 16 ? '0' + str : str;
}

export namespace Colors {
    export function colorFromRgb(r: number, g: number, b: number) {
        return Color.fromRgb(r, g, b)
    }

    export function colorFromHsv(h: number, s: number, v: number) {
        const { r, g, b } = hsv2rgb(h, s, v);
        return Color.fromRgb(r, g, b);
    }

    export function colorToHexString(clr: number) {
        const [r, g, b] = Color.toRgb(Color(clr));
        return rgbToHexString(r, g, b);
    }

    export function colorToHsv(clr: number) {
        const [r, g, b] = Color.toRgb(Color(clr));
        return rgb2hsv(r, g, b);
    }

    export function colorToRgb(clr: number) {
        const [r, g, b] = Color.toRgb(Color(clr));
        return { r, g, b };
    }

    export function hsv2rgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
        const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
        return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
    }

    export function hsvToColor(h: number, s: number, v: number) {
        const { r, g, b } = hsv2rgb(h, s, v);
        return Color.fromRgb(r, g, b);
    }

    export function hsvToHexString(h: number, s: number, v: number) {
        const { r, g, b } = hsv2rgb(h, s, v);
        return rgbToHexString(r, g, b);
    }

    export function rgbToHexString(r: number, g: number, b: number) {
        return `#${ntxs(r)}${ntxs(g)}${ntxs(b)}`;
    }

    export function rgb2hsv(r: number, g: number, b: number) {
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
}
