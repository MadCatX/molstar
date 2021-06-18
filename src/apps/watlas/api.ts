/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import { WatlasApp } from './index';
import { NtC, Resources, Sequence } from './resources';

/**
 * This class represents the public API of the Watlas Viewer Molstar plugin.
 * The API globally available through `WVApi` global variable.
 */
export class Api {
    private app: WatlasApp;

    /**
     * For internal use only.
     */
    bind(app: WatlasApp) {
        this.app = app;
    }

    /**
     * Displays given fragment in the viewer.
     *
     * If the resources needed to display the fragment were not loaded prior to calling this function,
     * the function will attempt to load them.
     * If the function needs to load resources and some resources fail to load, an array of strings
     * with appropriate error messages will be thrown.
     *
     * @param NtC NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, U, C)
     * @param shownStructures List of structures that will be initially shown. Valid options are `reference`, `base`, `phos` and `dinu`
     * @param shownDensityMaps List of density maps that will be initially shown. Valid options are `base`, `phos` and `dinu`.
     */
    async add(ntc: NtC, seq: Sequence, shownStructures: Resources.Structures[], shownDensityMaps: Resources.DensityMaps[]) {
        await this.app.add(ntc, seq, shownStructures, shownDensityMaps);
    }

    /**
     * Returns `true` if the given fragment is currently displayed in the viewer, false otherwise
     *
     * @param NtC NtC class of the fragment
     * @param seq Sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, U, C)
     */
    has(ntc: NtC, seq: Sequence) {
        return this.app.has(ntc, seq);
    }

    /**
     * Loads all resources needed to display given list of fragments.
     *
     * If the function fails to load some resources an array of strings
     * with appropriate error messages will be thrown. Note that throwing may
     * indicate only a partial failure
     *
     * @param fragments List of `fragment` objects. `ntc` field denotes NtC class of the fragment, `seq` field denotes nucleotide sequence of the fragment
     */
    async load(fragments: { ntc: NtC, seq: Sequence }[]) {
        await this.app.load(fragments);
    }

    /**
     * Removes fragment from the viewer
     *
     * @param NtC NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, U, C)
     */
    async remove(ntc: NtC, seq: Sequence) {
        await this.app.remove(ntc, seq);
    }

    /**
     * Removes fragment from the viewer and releases all corresponding resources
     *
     * @param NtC NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, U, C)
     */
    async unload(ntc: NtC, seq: Sequence) {
        await this.app.unload(ntc, seq);
    }
}
