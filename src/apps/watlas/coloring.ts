/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import { Color } from '../../mol-util/color';

function hsv2rgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
  const f = (n: number, k = (n + h / 60 ) % 6) => v - v * s * Math.max( Math.min(k, 4 - k, 1), 0);
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

function hsvToColor(h: number, s: number, v: number) {
    const { r, g, b } = hsv2rgb(h, s, v)
    return Color.fromRgb(r, g, b);
}

export namespace Coloring {
    export function baseColor(hue: number) {
        return hsvToColor(hue, 1, 1);
    }

    export function phosColor(hue: number) {
        return hsvToColor((hue + 30) % 360, 0.95, 0.75);
    }

    export function stepColor(hue: number) {
        return hsvToColor((hue + 60) % 360, 0.38, 0.75);
    }

    /* https://alienryderflex.com/hsp.html */
    export function luminance(color: Color) {
        let [ r, g, b ] = Color.toRgb(color);
        r /= 255.0;
        g /= 255.0;
        b /= 255.0;
        return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    }

    export function nextHue(hue: number) {
        return (hue + 77) % 360;
    }
}
