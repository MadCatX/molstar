/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Api } from './api';
import { Measurements } from '../watlas-common/measurements';
import { Util } from '../watlas-common/util';
import { OrderedSet } from '../../mol-data/int';
import { Vec3 } from '../../mol-math/linear-algebra/3d/vec3';
import { Quat } from '../../mol-math/linear-algebra/3d/quat';
import { Loci } from '../../mol-model/loci';
import { Structure, StructureElement, StructureProperties } from '../../mol-model/structure';
import { UnitIndex } from '../../mol-model/structure/structure/element/util';
import { Volume } from '../../mol-model/volume';
import { PluginBehavior, PluginBehaviors } from '../../mol-plugin/behavior';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { PluginSpec } from '../../mol-plugin/spec';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { createPlugin } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { Representation } from '../../mol-repr/representation';
import { Script } from '../../mol-script/script';
import { StateSelection } from '../../mol-state';
import { StateTreeSpine } from '../../mol-state/tree/spine';
import { arrayMax } from '../../mol-util/array';
import { Color } from '../../mol-util/color';
import { Binding } from '../../mol-util/binding';
import { ButtonsType, ModifiersKeys } from '../../mol-util/input/input-observer';
import { MarkerAction } from '../../mol-util/marker-action';
import { ParamDefinition as PD } from '../../mol-util/param-definition';

const SPIN_ANIM_PERIOD_MS = 50;
const SPIN_ANIM_DPS = -12; // Rotation speed in degrees per second
const SPIN_ANIM_THETA = (SPIN_ANIM_DPS * Math.PI / 180) * (SPIN_ANIM_PERIOD_MS / 1000);

const SelectAllProtein = Script('(sel.atom.atoms (= atom.entity-type polymer))', 'mol-script');
const SelectEverything = Script('(sel.atom.atoms true)', 'mol-script');

const AAVisualTag = 'aa-visual';

const spinnerAxis = Vec3.zero();
const spinnerQuat = Quat.zero();
const spinnerDirection = Vec3.zero();
const camResTmp = Vec3.zero();

let cameraLocked = false;

const WAApi = new Api();
(window as any).WAApi = WAApi;

function viewerId(baseId: string) {
    return baseId + '-viewer';
}

const WatAALociSelectionBindings = {
    clickToggle: Binding([Binding.Trigger(ButtonsType.Flag.Primary)], 'Set selection to clicked element using ${triggers}.'),
    clickDeselectAllOnEmpty: Binding([Binding.Trigger(ButtonsType.Flag.Primary)], 'Deselect all when clicking on nothing using ${triggers}.'),
};
const WatAALociSelectionParams = {
    bindings: PD.Value(WatAALociSelectionBindings, { isHidden: true }),
};
type WatAALociSelectionProps = PD.Values<typeof WatAALociSelectionParams>;

const WatAALociSelectionProvider = PluginBehavior.create({
    name: 'wataa-loci-selection-provider',
    category: 'interaction',
    display: { name: 'Interactive loci selection' },
    params: () => WatAALociSelectionParams,
    ctor: class extends PluginBehavior.Handler<WatAALociSelectionProps> {
        private spine: StateTreeSpine.Impl;
        private lociMarkProvider = (reprLoci: Representation.Loci, action: MarkerAction, noRender?: boolean) => {
            if (!this.ctx.canvas3d) return;
            this.ctx.canvas3d.mark({ loci: reprLoci.loci }, action, noRender);
        };
        private applySelectMark(ref: string, clear?: boolean) {
            const cell = this.ctx.state.data.cells.get(ref);
            if (cell && PSO.isRepresentation3D(cell.obj)) {
                this.spine.current = cell;
                const so = this.spine.getRootOfType(PSO.Molecule.Structure);
                if (so) {
                    if (clear) {
                        this.lociMarkProvider({ loci: Structure.Loci(so.data) }, MarkerAction.Deselect);
                    }
                    const loci = this.ctx.managers.structure.selection.getLoci(so.data);
                    this.lociMarkProvider({ loci }, MarkerAction.Select);
                }
            }
        }
        register() {
            const lociIsEmpty = (current: Representation.Loci) => Loci.isEmpty(current.loci);
            const lociIsNotEmpty = (current: Representation.Loci) => !Loci.isEmpty(current.loci);

            const actions: [keyof typeof WatAALociSelectionBindings, (current: Representation.Loci) => void, ((current: Representation.Loci) => boolean) | undefined][] = [
                ['clickDeselectAllOnEmpty', () => this.ctx.managers.interactivity.lociSelects.deselectAll(), lociIsEmpty],
                ['clickToggle', current => {
                    if (current.loci.kind === 'element-loci')
                        this.ctx.managers.interactivity.lociSelects.toggle(current, true);
                },
                lociIsNotEmpty],
            ];

            // sort the action so that the ones with more modifiers trigger sooner.
            actions.sort((a, b) => {
                const x = this.params.bindings[a[0]], y = this.params.bindings[b[0]];
                const k = x.triggers.length === 0 ? 0 : arrayMax(x.triggers.map(t => ModifiersKeys.size(t.modifiers)));
                const l = y.triggers.length === 0 ? 0 : arrayMax(y.triggers.map(t => ModifiersKeys.size(t.modifiers)));
                return l - k;
            });

            this.subscribeObservable(this.ctx.behaviors.interaction.click, ({ current, button, modifiers }) => {
                if (!this.ctx.canvas3d) return;

                // only trigger the 1st action that matches
                for (const [binding, action, condition] of actions) {
                    if (Binding.match(this.params.bindings[binding], button, modifiers) && (!condition || condition(current))) {
                        action(current);
                        break;
                    }
                }
            });

            this.ctx.managers.interactivity.lociSelects.addProvider(this.lociMarkProvider);

            this.subscribeObservable(this.ctx.state.events.object.created, ({ ref }) => this.applySelectMark(ref));

            // re-apply select-mark to all representation of an updated structure
            this.subscribeObservable(this.ctx.state.events.object.updated, ({ ref, obj, oldObj, oldData, action }) => {
                const cell = this.ctx.state.data.cells.get(ref);
                if (cell && PSO.Molecule.Structure.is(cell.obj)) {
                    const structure: Structure = obj.data;
                    const oldStructure: Structure | undefined = action === 'recreate' ? oldObj?.data :
                        action === 'in-place' ? oldData : undefined;
                    if (oldStructure &&
                        Structure.areEquivalent(structure, oldStructure) &&
                        Structure.areHierarchiesEqual(structure, oldStructure)) return;

                    const reprs = this.ctx.state.data.select(StateSelection.Generators.ofType(PSO.Molecule.Structure.Representation3D, ref));
                    for (const repr of reprs) this.applySelectMark(repr.transform.ref, true);
                }
            });

        }
        unregister() {
        }
        constructor(ctx: PluginContext, params: WatAALociSelectionProps) {
            super(ctx, params);
            this.spine = new StateTreeSpine.Impl(ctx.state.data.cells);
        }
    },
});

class WatAAViewer {
    plugin: PluginUIContext;
    private spinner: ReturnType<typeof setInterval> | null;

    constructor(target: HTMLElement) {
        const defaultSpec = DefaultPluginUISpec();
        const spec: PluginUISpec = {
            ...defaultSpec,
            behaviors: [
                PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
                PluginSpec.Behavior(WatAALociSelectionProvider),
            ],
            components: {
                ...defaultSpec.components,
                controls: {
                    ...defaultSpec.components?.controls,
                    top: 'none',
                    bottom: 'none',
                    left: 'none',
                    right: 'none'
                },
            },
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: false,
                },
            },
        };

        this.spinner = null;
        this.plugin = createPlugin(target, spec);

        this.plugin.managers.interactivity.setProps({ granularity: 'element' });
    }

    private async hide(refs: string[]) {
        const state = this.plugin.state.data;

        const b = this.plugin.build();
        for (const ref of refs) {
            const cell = state.cells.has(ref);
            if (cell)
                b.delete(ref);
        }

        await b.commit();
    }

    private mkDataRef(ref: string, kind: 'structure' | 'density-map') {
        return `${ref}_${kind}_data`;
    }

    private mkFullStructRef(ref: string) {
        return ref + '_full_structure';
    }

    private mkDensityMapRef(ref: string) {
        return ref + '_density-map';
    }

    private mkQmWaterIdf(idx: number, ref: string) {
        return `${ref}_qmw${idx}`;
    }

    private mkStructRef(ref: string, kind: 'protein' | 'water' | 'everything') {
        return ref + '_structure_' + kind;
    }

    private mkVisRef(ref: string, kind: 'structure-protein' | 'structure-water' | 'density-map') {
        return `${ref}_${kind}_visual`;
    }

    async hideByTag(tag: string) {
        const state = this.plugin.state.data;
        const b = state.build();
        let tagged = state.select(StateSelection.withTag(StateSelection.Generators.root.subtree(), tag));
        for (const obj of tagged)
            b.delete(obj);

        await b.commit();
    }

    async hideDensityMap(ref: string) {
        await this.hide([this.mkVisRef(ref, 'density-map')]);
    }

    async hideQmWaterPosition(idx: number, ref: string) {
        await this.hide([this.mkVisRef(this.mkQmWaterIdf(idx, ref), 'structure-water')]);
    }

    async hideStructure(ref: string) {
        await this.hide([this.mkVisRef(ref, 'structure-protein'), this.mkVisRef(ref, 'structure-water')]);
    }

    isDensityMapShown(ref: string) {
        return this.plugin.state.data.cells.has(this.mkVisRef(ref, 'density-map'));
    }

    isQmWaterPositionShown(idx: number, ref: string) {
        return this.plugin.state.data.cells.has(this.mkVisRef(this.mkQmWaterIdf(idx, ref), 'structure-water'));
    }

    isSpinning() {
        return this.spinner;
    }

    isStructureAvailable(ref: string) {
        return this.plugin.state.data.cells.has(this.mkFullStructRef(ref));
    }

    isStructureShown(ref: string) {
        return this.plugin.state.data.cells.has(this.mkVisRef(ref, 'structure-protein'));
    }

    async loadDensityMap(url: string, ref: string) {
        const b = this.plugin.state.data.build().toRoot()
            .apply(StateTransforms.Data.Download, { url, isBinary: true }, { state: { isGhost: true }, ref: this.mkDataRef(ref, 'density-map') })
            .apply(StateTransforms.Data.ParseCcp4, {}, { state: { isGhost: true } })
            .apply(StateTransforms.Volume.VolumeFromCcp4, {}, { ref: this.mkDensityMapRef(ref) });

        await b.commit({ revertOnError: true });
    }

    async loadQmWaterPositions(urls: string[], ref: string) {
        const b = this.plugin.state.data.build().toRoot();

        for (let idx = 0; idx < urls.length; idx++) {
            const qmwIdf = this.mkQmWaterIdf(idx, ref);
            const url = urls[idx];

            b.toRoot()
                .apply(StateTransforms.Data.Download, { url }, { state: { isGhost: true }, ref: this.mkDataRef(qmwIdf, 'structure') })
                .apply(StateTransforms.Model.TrajectoryFromXYZ, {}, { state: { isGhost: true } })
                .apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 })
                .apply(StateTransforms.Model.StructureFromModel, {}, { ref: this.mkStructRef(qmwIdf, 'everything') });
        }

        await b.commit({ revertOnError: true });
    }

    async loadStructure(url: string, ref: string) {
        const fsRef = this.mkFullStructRef(ref)
        const b = this.plugin.state.data.build().toRoot()
            .apply(StateTransforms.Data.Download, { url }, { state: { isGhost: true }, ref: this.mkDataRef(ref, 'structure') })
            .apply(StateTransforms.Model.TrajectoryFromPDB, {}, { state: { isGhost: true } })
            .apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 })
            .apply(StateTransforms.Model.StructureFromModel, {}, { ref: fsRef })
            .apply(StateTransforms.Model.StructureComplexElement, { type: 'water' }, { ref: this.mkStructRef(ref, 'water') })
            .to(fsRef)
            .apply(StateTransforms.Model.StructureComplexElement, { type: 'protein' }, { ref: this.mkStructRef(ref, 'protein') });

        await b.commit({ revertOnError: true });
    }

    async resetCamera(ref: string) {
        const cells = this.plugin.state.data.cells;
        const proteinCell = cells.get(this.mkStructRef(ref, 'protein'));
        const everythingCell = cells.get(this.mkFullStructRef(ref));
        if (!proteinCell || !everythingCell) {
            console.warn('Attempted to reset camera with no structure');
            return;
        }

        const proteinSphere = Loci.getBoundingSphere(Script.toLoci(SelectAllProtein, proteinCell.obj!.data));
        const everythingSphere = Loci.getBoundingSphere(Script.toLoci(SelectEverything, everythingCell.obj!.data));
        if (!proteinSphere || !everythingSphere) {
            console.warn('Unable to get bounding spheres for camera positioning');
            return;
        }

        const radius = everythingSphere.radius * 6.0;
        const zv = Vec3.zero();
        zv[2] = radius;
        Vec3.sub(camResTmp, proteinSphere.center, zv);

        if (!cameraLocked) {
            cameraLocked = true;
            await PluginCommands.Camera.Reset(this.plugin, { snapshot: { target: proteinSphere.center, position: camResTmp }, durationMs: 0 });
            cameraLocked = false;
        }
    }

    async showDensityMap(occupancy: number, ref: string) {
        const mapRef = this.mkDensityMapRef(ref);
        const state = this.plugin.state.data;

        if (!state.cells.has(mapRef))
            return;

        const b = state.build().to(mapRef)
            .apply(
                StateTransforms.Representation.VolumeRepresentation3D,
                {
                    colorTheme: { name: 'uniform', params: { value: Color(0x0000FF) } },
                    type: {
                        name: 'isosurface',
                        params: {
                            sizeFactor: 0.3,
                            isoValue: Volume.IsoValue.absolute(occupancy),
                            visuals: ['wireframe'],
                        }
                    }
                },
                {
                    ref: this.mkVisRef(ref, 'density-map'),
                    tags: AAVisualTag,
                }
            );

        await b.commit();
    }

    async showQmWaterPosition(idx: number, ref: string) {
        const state = this.plugin.state.data;
        const qmwIdf = this.mkQmWaterIdf(idx, ref);
        const dataRef = this.mkStructRef(qmwIdf, 'everything');

        if (!state.cells.has(dataRef))
            return;

        const b = state.build().to(dataRef)
            .apply(
                StateTransforms.Representation.StructureRepresentation3D,
                {
                    colorTheme: {
                        name: 'element-symbol',
                        params: {
                            carbonColor: { name: 'custom', params: Color(0xDDDDDD) }
                        },
                    },
                    type: {
                        name: 'ball-and-stick', params: {
                            alpha: 0.5,
                        }
                    }
                },
                {
                    ref: this.mkVisRef(qmwIdf, 'structure-water'),
                    tags: AAVisualTag,
                }
            );

        await b.commit();
    }

    async showStructure(ref: string) {
        const state = this.plugin.state.data;
        let structRef = this.mkStructRef(ref, 'protein');

        if (!state.cells.has(structRef))
            return;

        const b = state.build().to(structRef)
            .apply(
                StateTransforms.Representation.StructureRepresentation3D,
                {
                    colorTheme: {
                        name: 'element-symbol',
                        params: {
                            carbonColor: { name: 'custom', params: Color(0xDDDDDD) }
                        }
                    },
                    type: {
                        name: 'ball-and-stick',
                        params: {}
                    }
                },
                {
                    ref: this.mkVisRef(ref, 'structure-protein'),
                    tags: AAVisualTag,
                }
            );

        structRef = this.mkStructRef(ref, 'water');
        const watersCell = state.cells.get(structRef)!;
        if (watersCell && watersCell.obj!.data) {
            b.to(structRef)
                .apply(
                    StateTransforms.Representation.StructureRepresentation3D,
                    {
                        colorTheme: {
                            name: 'uniform',
                            params: {
                                value: Color(0x00FFFF)
                            }
                        },
                        type: {
                            name: 'ball-and-stick',
                            params: {}
                        }
                    },
                    {
                        ref: this.mkVisRef(ref, 'structure-water'),
                        tags: AAVisualTag,
                    }
                );

            /* Here we assume that the selected substructure contains only waters
             * Additional check for entity type === "water" would be needed had this assumption not been true */
            const data = watersCell.obj!.data;
            for (const unit of data.units) {
                for (let idx = 0; idx < unit.elements.length; idx++) {
                    const eI = unit.elements[idx];
                    const location = StructureElement.Location.create(data, unit, eI);
                    const hydSiteNo = StructureProperties.residue.auth_seq_id(location);

                    const loci = StructureElement.Loci(data, [{ unit, indices: OrderedSet.ofSingleton(idx as UnitIndex) }]);

                    b.apply(
                        StateTransforms.Model.MultiStructureSelectionFromExpression,
                        {
                            selections: [
                                { key: 'hs', ref: watersCell.transform.ref, expression: StructureElement.Loci.toExpression(loci) }
                            ],
                            isTransitive: true,
                        },
                        {
                            dependsOn: [watersCell.transform.ref],
                            tags: 'hs',
                            state: { isGhost: true },
                        }
                    ).apply(
                        StateTransforms.Representation.StructureSelectionsLabel3D,
                        {
                            borderColor: Color(0x000000),
                            borderWidth: 0.3,
                            textColor: Color(0xFFFFFFF),
                            offsetX: 0.25,
                            offsetY: 0.25,
                            offsetZ: 0.5,
                            customText: `HS${hydSiteNo}`,
                        },
                        {
                            state: { isGhost: true },
                            tags: 'hs'
                        }
                    );
                }
            }
        }

        await b.commit();
    }

    toggleSpinning(enabled: boolean) {
        if (enabled) {
            this.spinner = setInterval(() => {
                const snapshot = this.plugin.canvas3d?.camera?.getSnapshot();
                if (!snapshot)
                    return;

                Vec3.sub(spinnerDirection, snapshot.position, snapshot.target);
                Vec3.normalize(spinnerAxis, snapshot.up);
                Quat.setAxisAngle(spinnerQuat, spinnerAxis, SPIN_ANIM_THETA);
                Vec3.transformQuat(spinnerDirection, spinnerDirection, spinnerQuat);
                Vec3.add(spinnerDirection, spinnerDirection, snapshot.target);

                if (!cameraLocked)
                    this.plugin.canvas3d?.requestCameraReset({ snapshot: { position: spinnerDirection }, durationMs: 0 });
            },
            SPIN_ANIM_PERIOD_MS
            );
        } else {
            if (!this.spinner)
                return;

            clearInterval(this.spinner);
            this.spinner = null;
        }
    }

    async changeWaterDensityMapOccupancy(occupancy: number, ref: string) {
        const volRef = this.mkDensityMapRef(ref);
        const visRef = this.mkVisRef(ref, 'density-map');
        const state = this.plugin.state.data;

        const volCell = state.cells.get(volRef);
        if (!volCell)
            return;

        const cell = state.cells.get(visRef);
        if (!cell)
            return;

        const b = state.build().to(this.mkVisRef(ref, 'density-map'))
            .update(
                StateTransforms.Representation.VolumeRepresentation3D,
                old => (
                    {
                        ...old,
                        type: {
                            ...old.type,
                            params: {
                                ...old.type.params,
                                isoValue: Volume.IsoValue.absolute(occupancy),
                            }
                        }
                    }
                )
            );
        await b.commit();
    }
}

interface WatAAProps extends Partial<WatAAApp.Configuration> {
    appId: string;
}

interface WatAAState {
    currentAA: string;
    label: string;
    errorMsg: string | null;
}

export class WatAAApp extends React.Component<WatAAProps, WatAAState> {
    private viewer: WatAAViewer | null;
    private loadedAminoAcids: Map<string, { numHydrationSites: number }>;

    constructor(props: WatAAProps) {
        super(props);

        this.viewer = null;
        this.loadedAminoAcids = new Map();

        this.state = {
            currentAA: '',
            label: '',
            errorMsg: null,
        };
    }

    isCrystalStructureShown(aa: string) {
        return this.viewer?.isStructureShown(aa) ?? false;
    }

    isQmWaterPositionShown(idx: number, aa: string) {
        return this.viewer?.isQmWaterPositionShown(idx, aa) ?? false;
    }

    isWaterDensityMapShown(aa: string) {
        return this.viewer?.isDensityMapShown(aa) ?? false;
    }

    private async loadAminoAcid(aa: string, structUrl: string, densityMapUrl: string, qmWaterStructUrls: string[]) {
        if (!this.loadedAminoAcids.has(aa)) {
            await this.viewer!.loadStructure(structUrl, aa);
            await this.viewer!.loadDensityMap(densityMapUrl, aa);
            await this.viewer!.loadQmWaterPositions(qmWaterStructUrls, aa);

            this.loadedAminoAcids.set(aa, { numHydrationSites: qmWaterStructUrls.length });
        }
    }

    private mkLabel(aa: string, qmWaters?: number[]) {
        const blks = aa.split('_');
        blks[0] = Util.capitalize(blks[0]);
        const label = blks.join('_');

        if (qmWaters && qmWaters.length > 0)
            return label + '_' + qmWaters.map(idx => `HS${idx + 1}`).join('_');
        return label;
    }

    async hideAminoAcid(aa: string) {
        if (!this.viewer)
            throw new Error('Attempted to hide amino acid before initializing the viewer');

        this.viewer.toggleSpinning(false);
        await this.viewer.hideByTag(AAVisualTag);

        if (this.state.currentAA === aa)
            this.setState({ ...this.state, currentAA: '', label: '', errorMsg: null });
    }

    async showAminoAcid(aa: string, structUrl: string, densityMapUrl: string, qmWaterStructUrls: string[], options: Partial<Api.DisplayOptions>) {
        if (!this.viewer)
            throw new Error('Attempted to show amino acid before initializing the viewer');

        await this.loadAminoAcid(aa, structUrl, densityMapUrl, qmWaterStructUrls);

        if (options.showCrystalStructure)
            await this.viewer.showStructure(aa);
        if (options.showWaterDensityMap)
            await this.viewer.showDensityMap(options.densityMapOccupancy ?? 0.1, aa);

        for (const num of options.shownQmWaterPositions ?? [])
            await this.viewer.showQmWaterPosition(num, aa);

        await this.viewer.resetCamera(aa);

        Measurements.clearSelection(this.viewer.plugin);
        Measurements.removeAllMeasurements(this.viewer.plugin);

        if (this.viewer.isStructureAvailable(aa))
            this.setState({ ...this.state, currentAA: aa, label: this.mkLabel(aa, options.shownQmWaterPositions), errorMsg: null });
        else
            this.setState({ ...this.state, currentAA: '', label: '', errorMsg: 'Cannot display amino acid' });

    }

    async toggleCrystalStructure(aa: string, show: boolean) {
        if (!this.viewer)
            throw new Error('Attempted to toggle crystal structure before initializing the viewer');

        if (!this.loadedAminoAcids.has(aa))
            throw new Error('Attempted to toggle crystal structure for an amino acid that has not been loaded yet');

        if (show)
            await this.viewer.showStructure(aa);
        else
            await this.viewer.hideStructure(aa);
    }

    async toggleQmWaterPositions(aa: string, idxs: number[], show: boolean) {
        if (!this.viewer)
            throw new Error('Attempted to show QM-optimized water position before initializing the viewer');

        if (!this.loadedAminoAcids.has(aa))
            throw new Error('Attempted to display QM-optimized water position for an amino acid that has not been loaded yet');

        for (const idx of idxs) {
            if (show)
                await this.viewer.showQmWaterPosition(idx, aa);
            else
                await this.viewer.hideQmWaterPosition(idx, aa);
        }

        if (show)
            this.setState({ ...this.state, label: this.mkLabel(this.state.currentAA, idxs) });
        else
            this.setState({ ...this.state, label: this.mkLabel(this.state.currentAA) });
    }

    toggleSpinning(enabled: boolean) {
        if (!this.viewer)
            throw new Error('Attempted to toggle spinning before initializing the viewer');

        this.viewer.toggleSpinning(enabled);
    }

    async toggleWaterDensityMap(aa: string, relativeIso: number, show: boolean) {
        if (!this.viewer)
            throw new Error('Attempted to toggle water density map before initializing the viewer');

        if (!this.loadedAminoAcids.has(aa))
            throw new Error('Attempted to toggle water density map for an amino acid that has not been loaded yet');

        if (show)
            await this.viewer.showDensityMap(relativeIso, aa);
        else
            await this.viewer.hideDensityMap(aa);
    }

    async changeWaterDensityMapOccupancy(aa: string, occupancy: number) {
        if (!this.viewer)
            throw new Error('Attempted to toggle water density map before initializing the viewer');

        await this.viewer.changeWaterDensityMapOccupancy(occupancy, aa);
    }

    componentDidMount() {
        const elem = document.getElementById(viewerId(this.props.appId));
        if (!elem)
            throw new Error('No element to display the viewer in');

        if (!this.viewer)
            this.viewer = new WatAAViewer(elem);

        WAApi.bind(this, this.props.appId);

        this.forceUpdate(); /* Necessary to make sure that we pass the Molstar plugin to Measurements */
    }

    render() {
        return (
            <div className='waav-app-container'>
                <div className='waav-ms-viewer-container'>
                    <div id={viewerId(this.props.appId)} className='waav-ms-viewer'></div>
                    {this.state.errorMsg
                        ? <div className='waav-error-msg'>{this.state.errorMsg}</div>
                        : undefined
                    }
                    <div className='waav-aminoacid-identifier'>{this.state.label}</div>
                </div>
                <Measurements plugin={this.viewer?.plugin} orientation='horizontal' />
            </div>
        );
    }
}

export namespace WatAAApp {
    export interface Configuration {
    }

    export function init(appId: string, configuration: Partial<Configuration>) {
        const elem = document.getElementById(appId);
        if (!elem)
            throw new Error(`Element with id ${appId} does not exist`);

        ReactDOM.render(<WatAAApp {...configuration} appId={appId} />, elem);
    }
}
