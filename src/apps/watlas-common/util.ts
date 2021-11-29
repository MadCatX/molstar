/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

export namespace Util {
    export function capitalize(s: string) {
        if (s.length > 1)
            return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
        return s.toUpperCase();
    }

    export function replaceEvery(s: string, what: string, by: string) {
        while (s.indexOf(what) >= 0)
            s = s.replace(what, by);
        return s;
    }

    export function triggerResize() {
        window.dispatchEvent(new Event('resize'));
    }
}
