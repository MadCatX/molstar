/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { WatAAApp } from './index';

/**
 * This class represents the public API of the WatAA Viewer Molstar plugin.
 * The API is globally available through `WAApi` global variable.
 */
export class Api {
    private instances: Map<string, WatAAApp>;

    constructor() {
        this.instances = new Map();
    }

    /**
     * For internal use only.
     *
     * @param app WatAAApp instance
     * @param id Unique ID of the WatAAApp instance
     */
    bind(app: WatAAApp, id: string) {
        if (this.instances.has(id))
            throw new Error(`WatlasApp with id ${id} is already bound`);

        this.instances.set(id, app);
    }

    /**
     * Changes occupancy cutoff of the water density map.
     * This function has no effect if the water density map is not shown
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     * @param occupancy Occupancy cutoff
     */
    async changeWaterDensityMapOccupancy(id: string, aa: string, occupancy: number) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        await inst.changeWaterDensityMapOccupancy(aa, occupancy);
    }

    /**
     * Initializes WatAAApp instance
     *
     * @param id Element id of the HTML element where the app should render. This id will also be used to identify the
     *           app instance within the API
     * @param configuration Configuration parameters for the Viewer
     */
    init(id: string, configuration: Partial<WatAAApp.Configuration>) {
        WatAAApp.init(id, configuration);
    }

    /**
     * Checks whether the crystal structure is shown
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     *
     * @returns True if the crystal structure is shown, false otherwise
     */
    isCrystalStructureShown(id: string, aa: string) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        return inst.isCrystalStructureShown(aa);
    }

    /**
     * Checks whether the QM-optimized water positions are shown
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     *
     * @returns True if the QM-optimized water positions are shown, false otherwise
     */
    isQmWaterPositionShown(id: string, idx: number, aa: string) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        return inst.isQmWaterPositionShown(idx, aa);
    }

    /**
     * Checks whether the water density map is shown
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     *
     * @returns True if the water density map is shown, false otherwise
     */
    isWaterDensityMapShown(id: string, aa: string) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        return inst.isWaterDensityMapShown(aa);
    }

    /**
     * Removes the entire amino acid from display including water density maps and QM-optimized water positions
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     */
    async hideAminoAcid(id: string, aa: string) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        inst.hideAminoAcid(aa);
    }

    /**
     * Displays amino acid in the viewer. Which parts of the amino acid will be displayed depends on the display options
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     * @param structUrl URL of the file with crystal structure
     * @param densityMapUrl URL of the file with water density map
     * @param qmWaterStructUrl List of URLs of the files with QM-optimized water positions
     * @param options Display options
     */
    async showAminoAcid(id: string, aa: string, structUrl: string, densityMapUrl: string, qmWaterStructUrls: string[], options: Partial<Api.DisplayOptions>) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        await inst.showAminoAcid(aa, structUrl, densityMapUrl, qmWaterStructUrls, options);
    }

    /**
     * Shows or hides the crystal structure in the viewer
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     * @param show True if the crystal structure should be shown, false otherwise
     */
    async toggleCrystalStructure(id: string, aa: string, show: boolean) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        await inst.toggleCrystalStructure(aa, show);
    }

    /**
     * Shows or hides the QM-optimized water positions in the viewer
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     * @param idxs List of indices of the QM-optimized water positions to be shown or hidden
     * @param show True if the QM-optimized water positions should be shown, false otherwise
     */
    async toggleQmWaterPositions(id: string, aa: string, idxs: number[], show: boolean) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        await inst.toggleQmWaterPositions(aa, idxs, show);
    }

    toggleSpinning(id: string, enabled: boolean) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        inst.toggleSpinning(enabled);
    }

    /**
     * Shows or hides the water density map in the viewer
     *
     * @param id Application instance id
     * @param aa Amino acid identifier
     * @param show True if the water density map should be shown, false otherwise
     */
    async toggleWaterDensityMap(id: string, aa: string, relativeIso: number, show: boolean) {
        const inst = this.instances.get(id);
        if (!inst)
            throw new Error(`WatlasApp instance ${id} is not registered`);

        await inst.toggleWaterDensityMap(aa, relativeIso, show);
    }
}

export namespace Api {
    export interface DisplayOptions {
        densityMapOccupancy: number;
        showCrystalStructure: boolean;
        showWaterDensityMap: boolean;
        waterDensityOccupancy: number;
        shownQmWaterPositions: number[];
    }
}
