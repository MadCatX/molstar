/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { ColorInfo, OnFragmentLoaded, OnFragmentStateChanged, WatlasApp } from './index';
import { Resources } from './resources';

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
     * @param fragId Unique identifier of the structural fragment that is being added
     * @param paths Paths to structure and density map files
     * @param referenceName Name of the reference to be displayed in the list of fragments
     * @param shownStructures List of structures that will be initially shown. Valid options are `reference`, `base`, `phos` and `step`
     * @param shownDensityMaps List of density maps that will be initially shown. Valid options are `base`, `phos` and `step`.
     */
    async add(id: string, fragId: string, referenceName: { text: string; transform: boolean }, paths: Resources.Paths, shownStructures: Resources.Structures[], shownDensityMaps: Resources.DensityMaps[]) {
        const inst = this.instance(id);
        await inst.add(fragId, paths, referenceName, shownStructures, shownDensityMaps);
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
     * @param fragId Unique identifier of the structural fragment
     * @param seq Nucleotide sequence of the fragment. Syntax is `M_N` where `M` and `N` are nucleotide identifiers (A, T, G, C)
     * @param format Return type format. `style` for CSS-formatted color string or `rgb` for array of RGB values in 0 - 255 range
     *
     * @return ColorInfo
     */
    fragmentColors(id: string, fragId: string, format: 'style' | 'rgb'): ColorInfo | undefined {
        const inst = this.instance(id);
        return inst.fragmentColors(fragId, format);
    }

    /**
     * Returns `true` if the given fragment is currently displayed in the viewer, `false` otherwise
     *
     * @param id WatlasApp instance id
     * @param fragId Unique identifier of the structural fragment
     */
    has(id: string, fragId: string) {
        const inst = this.instance(id);
        return inst.has(fragId);
    }

    /**
     * Initializes WatlasApp instance
     *
     * @param id Element id of the HTML element where the app should render. This id will also be used to identify the
     *           app instance within the API
     * @param configuration Optional configuration parameters for the Viewer
     */
    init(id: string, configuration: WatlasApp.Configuration) {
        WatlasApp.init(id, configuration);
    }

    /**
     * Loads all resources needed to display given list of fragments.
     *
     * If the function fails to load some resources an array of strings
     * with appropriate error messages will be thrown. Note that throwing may
     * indicate only a partial failure
     *
     * @param id WatlasApp instance id
     * @param fragments List of `fragment` objects. `fragId` field denotes unique identifier of the fragment,
     *                  `paths` field denotes Paths object with paths to structure and density map files
     * @param callback Called when loading of one fragment is completed
     */
    async load(id: string, fragments: { fragId: string, paths: Resources.Paths }[], callback?: OnFragmentLoaded) {
        const inst = this.instance(id);
        await inst.load(fragments, callback);
    }

    /**
     * Removes fragment from the viewer
     *
     * @param id WatlasApp instance id
     * @param fragId Unique identifier of the structural fragment
     */
    async remove(id: string, fragId: string) {
        const inst = this.instance(id);
        await inst.remove(fragId);
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
     * Sets custom callback that gets called when fragment colors get changed by the viewer
     *
     * @param id WatlasApp instance id
     * @param callback Callback function to be called
     */
    setOnFragmentColorsChangedCallback(id: string, callback: OnFragmentStateChanged) {
        const inst = this.instance(id);
        inst.setOnFragmentColorsChangedCallback(callback);
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
     * @param fragId Unique identifier of the structural fragment
     */
    async unload(id: string, fragId: string) {
        const inst = this.instance(id);
        await inst.unload(fragId);
    }
}
