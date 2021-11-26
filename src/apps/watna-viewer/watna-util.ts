/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { Range } from './fragment-description';

export namespace WatNAUtil {
    export function isoBounds(min: number, max: number): { min: number, max: number, step: number } {
        let diff = max - min;
        if (diff <= 0.0)
            return { min, max, step: 0.01 }; // This should never happen

        diff /= 25;
        let l = Math.log10(diff);
        l = Math.floor(l);
        const step = Math.pow(10.0, l);

        min = Math.floor((min - step) / step) * step;
        max = Math.floor((max + step) / step) * step;

        return { min, max, step };
    }

    export function mid(range: Range<number>) {
        return (range.max - range.min) / 2 + range.min;
    }

    export function isoToFixed(iso: number, step: number) {
        const d = Math.log10(step);
        if (d >= 0)
            return iso.toFixed(0);
        return iso.toFixed(-d);
    }

    export function prettyIso(iso: number, step: number) {
        return Math.floor((iso - step) / step) * step + step;
    }
}
