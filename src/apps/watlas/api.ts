/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import { ColorInfo, OnFragmentStateChanged, WatlasApp } from './index';
import { NtC, Resources, Sequence } from './resources';

/**
 * This class represents the public API of the Watlas Viewer Molstar plugin.
 * The API is globally available through `WVApi` global variable.
 */
export class Api {
    private instances: Map<string, WatlasApp>;

    constructor() {
        this.instances = new Map();
    }

    private instance(id: string) {
        if (!this.instances.has(id))
            throw new Error(`WatlasApp instance with id ${id} is not bound`);
        return this.instances.get(id)!;
    }

    /**
     * For internal use only.
     */
    bind(app: WatlasApp, id: string) {
        if (this.instances.has(id))
            throw new Error(`WatlasApp with id ${id} is already bound`);

        this.instances.set(id, app);
    }

    /**
     * Displays given fragment in the viewer.
     *
     * If the resources needed to display the fragment were not loaded prior to calling this function,
     * the function will attempt to load them.
     * If the function needs to load resources and some resources fail to load, an array of strings
     * with appropriate error messages will be thrown.
     *
     * @param id WatlasApp instance id
     * @param ntc NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, G, C)
     * @param shownStructures List of structures that will be initially shown. Valid options are `reference`, `base`, `phos` and `step`
     * @param shownDensityMaps List of density maps that will be initially shown. Valid options are `base`, `phos` and `step`.
     */
    async add(id: string, ntc: NtC, seq: Sequence, shownStructures: Resources.Structures[], shownDensityMaps: Resources.DensityMaps[]) {
        const inst = this.instance(id);
        await inst.add(ntc, seq, shownStructures, shownDensityMaps);
    }

    /**
     * Calls `forceUpdate()` on the underlying React component
     *
     * @param id WatlasApp instance id
     */
    forceRerender(id: string) {
        this.instance(id).forceRerender();
    }

    /**
     * Returns colors assigned to a given fragment or undefined if the fragment does not have any colors assigned yet.
     *
     * @param id WatlasApp instance id
     * @param ntc NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, G, C)
     * @param format Return type format. `style` for CSS-formatted color string or `rgb` for array of RGB values in 0 - 255 range
     *
     * @return ColorInfo
     */
    fragmentColors(id: string, ntc: NtC, seq: Sequence, format: 'style' | 'rgb'): ColorInfo | undefined {
        const inst = this.instance(id);
        return inst.fragmentColors(ntc, seq, format);
    }

    /**
     * Returns `true` if the given fragment is currently displayed in the viewer, `false` otherwise
     *
     * @param id WatlasApp instance id
     * @param ntc NtC class of the fragment
     * @param seq Sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, G, C)
     */
    has(id: string, ntc: NtC, seq: Sequence) {
        const inst = this.instance(id);
        return inst.has(ntc, seq);
    }

    /**
     * Initializes WatlasApp instance
     *
     * @param id Element id of the HTML element where the app should render. This id will also be used to identify the
     *           app instance within the API
     */
    init(id: string) {
        WatlasApp.init(id);
    }

    /**
     * Loads all resources needed to display given list of fragments.
     *
     * If the function fails to load some resources an array of strings
     * with appropriate error messages will be thrown. Note that throwing may
     * indicate only a partial failure
     *
     * @param id WatlasApp instance id
     * @param fragments List of `fragment` objects. `ntc` field denotes NtC class of the fragment, `seq` field denotes nucleotide sequence of the fragment
     */
    async load(id: string, fragments: { ntc: NtC, seq: Sequence }[]) {
        const inst = this.instance(id);
        await inst.load(fragments);
    }

    /**
     * Removes fragment from the viewer
     *
     * @param id WatlasApp instance id
     * @param ntc NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, G, C)
     */
    async remove(id: string, ntc: NtC, seq: Sequence) {
        const inst = this.instance(id);
        await inst.remove(ntc, seq);
    }

    /**
     * Sets custom callback that gets called when a fragment is added to display
     *
     * @param id WatlasApp instance id
     * @param callback Callback function to be called
     */
    setOnFragmentAddedCallback(id: string, callback: OnFragmentStateChanged) {
        const inst = this.instance(id);
        inst.setOnFragmentAddedCallback(callback);
    }

    /**
     * Sets custom callback that gets called when a fragment is removed from display
     *
     * @param id WatlasApp instance id
     * @param callback Callback function to be called
     */
    setOnFragmentRemovedCallback(id: string, callback: OnFragmentStateChanged) {
        const inst = this.instance(id);
        inst.setOnFragmentRemovedCallback(callback);
    }

    /**
     * Removes fragment from the viewer and releases all corresponding resources
     *
     * @param id WatlasApp instance id
     * @param ntc NtC class of the fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, G, C)
     */
    async unload(id: string, ntc: NtC, seq: Sequence) {
        const inst = this.instance(id);
        await inst.unload(ntc, seq);
    }
}
