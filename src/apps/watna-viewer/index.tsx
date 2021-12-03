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
import { Coloring } from './coloring';
import { Controls } from './controls';
import { FragmentDescription } from './fragment-description';
import { List } from './list';
import { Resources } from './resources';
import { WatNAUtil } from './watna-util';
import * as ST from './substructure-types';
import { Collapsible } from '../watlas-common/collapsible';
import { Colors } from '../watlas-common/colors';
import { Measurements } from '../watlas-common/measurements';
import { Util } from '../watlas-common/util';
import { BoundaryHelper } from '../../mol-math/geometry/boundary-helper';
import { Loci } from '../../mol-model/loci';
import { Structure } from '../../mol-model/structure';
import { Volume } from '../../mol-model/volume';
import { PluginBehavior, PluginBehaviors } from '../../mol-plugin/behavior';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { PluginSpec } from '../../mol-plugin/spec';
import { LociLabel } from '../../mol-plugin-state/manager/loci-label';
import { createPlugin } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { RawData } from '../../mol-plugin-state/transforms/data';
import { Representation } from '../../mol-repr/representation';
import { StructureRepresentationRegistry } from '../../mol-repr/structure/registry';
import { Script } from '../../mol-script/script';
import { StateObjectCell, State as PluginState } from '../../mol-state';
import { StateObject } from '../../mol-state/object';
import { StateTransformer } from '../../mol-state/transformer';
import { StateBuilder } from '../../mol-state/state/builder';
import { arrayMax } from '../../mol-util/array';
import { Binding } from '../../mol-util/binding';
import { Color } from '../../mol-util/color';
import { ButtonsType, ModifiersKeys } from '../../mol-util/input/input-observer';
import { MarkerAction } from '../../mol-util/marker-action';
import { ParamDefinition as PD } from '../../mol-util/param-definition';
import { StateTreeSpine } from '../../mol-state/tree/spine';
import { StateSelection } from '../../mol-state';
import { ColorTheme } from '../../mol-theme/color';
import { lociLabel } from '../../mol-theme/label';

const AnimationDurationMsec = 150;
const DefaultDensityMapAlpha = 0.5;
const DefaultDensityMapStyle = 'wireframe';
const DefaultRadiusRatio = 1.0;
const SelectAllScript = Script('(sel.atom.atoms true)', 'mol-script');
const SphereBoundaryHelper = new BoundaryHelper('98');

export type ColorInfo = {
    base: string | [ number, number, number ],
    phosphate: string | [ number, number, number ],
    nucleotide: string | [ number, number, number ],
}

export const WatlasViewerApi = new Api();
(window as any).WVApi = WatlasViewerApi;

function mkResRef(fragId: string, kind: Resources.AllKinds, type: Resources.Type) {
    return baseRefToResRef(fragId, kind, type);
}

function baseRefToResRef(base: string, kind: Resources.AllKinds, type: Resources.Type) {
    return `${base}_${kind}_${type}`;
}

function mapStyleToVisuals(style: FragmentDescription.MapStyle) {
    switch (style) {
        case 'solid':
            return ['solid'];
        case 'wireframe':
            return ['wireframe'];
        case 'both':
            return ['solid', 'wireframe'];
    }
}

function downloadFile(blob: Blob, filename: string) {
    const element = document.createElement('a');
    const href = URL.createObjectURL(blob);
    element.setAttribute('href', href);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

type DownloadedResource = {
    data: string|Uint8Array;
    kind: Resources.AllKinds;
    type: Resources.Type
};

type StructureAppearance = {
    kind: ST.SubstructureType;
    repr: StructureRepresentationRegistry.BuiltIn;
    colorTheme: ColorTheme.BuiltIn; color: Color;
};

async function downloadResource(url: string, kind: Resources.AllKinds, type: Resources.Type) {
    const resp = await fetch(url);
    if (!resp.ok)
        throw new Error(`Cannot download ${url}: ${resp.statusText}`);

    if (type === 'density-map') {
        const blob = await resp.blob();
        const buf = await blob.arrayBuffer();
        return { data: new Uint8Array(buf), kind, type };
    } else {
        const text = await resp.text();
        return { data: text, kind, type };
    }
}

async function download(srcs: { url: string, kind: Resources.AllKinds, type: Resources.Type }[]) {
    const pending: Promise<DownloadedResource>[] = [];

    for (const src of srcs)
        pending.push(downloadResource(src.url, src.kind, src.type));

    const resources: DownloadedResource[] = [];
    const errors: string[] = [];
    for (const p of pending) {
        try {
            resources.push(await p);
        } catch (e) {
            errors.push(e.toString());
        }
    }

    if (errors.length > 0)
        throw errors;

    return resources;
}

const WatlasLociSelectionBindings = {
    clickFocus: Binding([Binding.Trigger(ButtonsType.Flag.Secondary)], 'Focus camera on selected loci using ${triggers}'),
    clickToggle: Binding([Binding.Trigger(ButtonsType.Flag.Primary)], 'Set selection to clicked element using ${triggers}.'),
    clickDeselectAllOnEmpty: Binding([Binding.Trigger(ButtonsType.Flag.Primary)], 'Deselect all when clicking on nothing using ${triggers}.'),
};
const WatlasLociSelectionParams = {
    bindings: PD.Value(WatlasLociSelectionBindings, { isHidden: true }),
};
type WatlasLociSelectionProps = PD.Values<typeof WatlasLociSelectionParams>;

const WatlasLociSelectionProvider = PluginBehavior.create({
    name: 'watlas-loci-selection-provider',
    category: 'interaction',
    display: { name: 'Interactive loci selection' },
    params: () => WatlasLociSelectionParams,
    ctor: class extends PluginBehavior.Handler<WatlasLociSelectionProps> {
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
        private focusOnLoci(loci: Representation.Loci) {
            if (!this.ctx.canvas3d)
                return;

            const sphere = Loci.getBoundingSphere(loci.loci);
            if (!sphere)
                return;
            const snapshot = this.ctx.canvas3d.camera.getSnapshot();
            snapshot.target = sphere.center;

            PluginCommands.Camera.SetSnapshot(this.ctx, { snapshot, durationMs: AnimationDurationMsec });
        }
        register() {
            const lociIsEmpty = (current: Representation.Loci) => Loci.isEmpty(current.loci);
            const lociIsNotEmpty = (current: Representation.Loci) => !Loci.isEmpty(current.loci);

            const actions: [keyof typeof WatlasLociSelectionBindings, (current: Representation.Loci) => void, ((current: Representation.Loci) => boolean) | undefined][] = [
                ['clickFocus', current => this.focusOnLoci(current), lociIsNotEmpty],
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
        constructor(ctx: PluginContext, params: WatlasLociSelectionProps) {
            super(ctx, params);
            this.spine = new StateTreeSpine.Impl(ctx.state.data.cells);
        }
    },
});

const WatlasLociLabelProvider = PluginBehavior.create({
    name: 'watlas-loci-label-provider',
    category: 'interaction',
    ctor: class implements PluginBehavior<undefined> {
        private f = {
            label: (loci: Loci) => {
                switch (loci.kind) {
                    case 'structure-loci':
                    case 'element-loci':
                        return lociLabel(loci);
                    default:
                        return '';
                }
            },
            group: (label: LociLabel) => label.toString().replace(/Model [0-9]+/g, 'Models'),
            priority: 100
        };
        register() { this.ctx.managers.lociLabels.addProvider(this.f); }
        unregister() { this.ctx.managers.lociLabels.removeProvider(this.f); }
        constructor(protected ctx: PluginContext) { }
    },
    display: { name: 'Watlas labeling' }
});

class WatlasViewer {
    readonly substructureTypes: ST.SubstructureType[] = [
        'nucleic',
        'water',
        'protein',
        'ligand'
    ];
    readonly visualTagTails = this.substructureTypes.map(e => this.mkVisRef('', e));

    plugin: PluginUIContext;
    baseRadius: number = 0;
    radiusRatio: number = DefaultRadiusRatio;

    constructor(target: HTMLElement) {
        const defaultSpec = DefaultPluginUISpec();
        const spec: PluginUISpec = {
            ...defaultSpec,
            behaviors: [
                PluginSpec.Behavior(WatlasLociLabelProvider),
                PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
                PluginSpec.Behavior(WatlasLociSelectionProvider),
            ],
            components: {
                ...defaultSpec.components,
                controls: {
                    ...defaultSpec.components?.controls,
                    top: 'none',
                    right: 'none',
                    bottom: 'none',
                    left: 'none'
                },
            },
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: false,
                },
            },
        };

        this.plugin = createPlugin(target, spec);

        this.plugin.managers.interactivity.setProps({ granularity: 'element' });
        this.plugin.selectionMode = true;
    }

    private colorThemeParams(color: Color, theme: ColorTheme.BuiltIn) {
        if (theme === 'element-symbol') {
            return {
                carbonColor: { name: 'custom', params: Color(0xDDDDDD) }
            };
        }

        return { value: color };
    }

    private densityMapColors(color: Color) {
        return { value: color };
    }

    private densityMapParams(iso: number, style: FragmentDescription.MapStyle) {
        const isoValue = Volume.IsoValue.absolute(iso);
        return {
            isoValue,
            alpha: DefaultDensityMapAlpha,
            visuals: mapStyleToVisuals(style),
            quality: 'highest',
            sizeFactor: 2,
        };
    }

    private getStructureParent(cell: StateObjectCell) {
        if (!cell.sourceRef)
            return undefined;
        const parent = this.plugin.state.data.cells.get(cell.sourceRef);
        if (!parent)
            return undefined;
        return parent.obj?.type.name === 'Structure' ? parent.obj : undefined;
    }

    private loadSubstructure<A extends StateObject<any, StateObject.Type<any>>, T extends StateTransformer<A, A>>(
        b: StateBuilder.To<A, T>,
        structureCell: StateObjectCell<A>,
        st: ST.SubstructureType,
        ref: string
    ) {
        return b.to(structureCell).apply(
            StateTransforms.Model.StructureComplexElement,
            { type: st },
            { ref: this.mkStructRef(ref, st) }
        );
    }

    private mkVisRef(base: string, st: ST.SubstructureType) {
        return base + '_visual' + '_' + st;
    }

    private mkStructRef(base: string, st: ST.SubstructureType) {
        return base + '_structure' + '_' + st;
    }

    private isVisualRef(ref: string) {
        if (ref.endsWith('_visual'))
            return true;
        for (const tail of this.visualTagTails) {
            if (ref.endsWith(tail))
                return true;
        }
        return false;
    }

    private setBaseRadius() {
        const spheres = [];
        const cells = this.plugin.state.data.cells;
        for (const [ref, cell] of Array.from(cells)) {
            if (!this.isVisualRef(ref))
                continue;
            const parent = this.getStructureParent(cell);
            if (parent) {
                const s = Loci.getBoundingSphere(Script.toLoci(SelectAllScript, parent.data));
                if (s)
                    spheres.push(s);
            }
        }

        if (spheres.length === 0)
            return;

        SphereBoundaryHelper.reset();
        for (const s of spheres)
            SphereBoundaryHelper.includePositionRadius(s.center, s.radius);
        SphereBoundaryHelper.finishedIncludeStep();
        for (const s of spheres)
            SphereBoundaryHelper.radiusPositionRadius(s.center, s.radius);

        this.baseRadius = SphereBoundaryHelper.getSphere().radius;
        this.updateClipping();
    }

    private setSubstructureAppearance<A extends StateObject<any, StateObject.Type<any>>, T extends StateTransformer<A, A>>(
        state: PluginState,
        b: StateBuilder.To<A, T>,
        base: string,
        st: ST.SubstructureType,
        reprType: { name: string, params: any },
        colorTheme: { name: string, params: any }
    ) {
        const cell = state.cells.get(this.mkVisRef(base, st));
        if (cell) {
            return b.to(cell)
                .update(StateTransforms.Representation.StructureRepresentation3D, old => ({ ...old, type: reprType, colorTheme })).to(cell);
        }
        return b;
    }

    private showSubstructure<A extends StateObject<any, StateObject.Type<any>>, T extends StateTransformer<A, A>>(
        state: PluginState,
        b: StateBuilder.To<A, T>,
        base: string,
        st: ST.SubstructureType,
        reprType: { name: string, params: any },
        colorTheme: { name: string, params: any }
    ) {
        const cell = state.cells.get(this.mkStructRef(base, st));
        if (cell) {
            return b.to(cell)
                .apply(StateTransforms.Representation.StructureRepresentation3D, { colorTheme, type: reprType }, { ref: this.mkVisRef(base, st) });
        }
        return b;
    }

    private updateClipping() {
        if (!this.plugin.canvas3d)
            return;

        const snapshot = this.plugin.canvas3d.camera.getSnapshot();
        snapshot.radius = this.baseRadius * this.radiusRatio;
        PluginCommands.Camera.SetSnapshot(this.plugin, { snapshot, durationMs: AnimationDurationMsec });
    }

    getCanvasImage(width: number, height: number, transparentBackground: boolean) {
        const c = this.plugin.canvas3d!;
        const { colorBufferFloat, textureFloat } = c.webgl.extensions;
        const aoProps = c.props.postprocessing.occlusion;
        const ip = c.getImagePass({
            transparentBackground,
            multiSample: {
                mode: 'on',
                sampleLevel: colorBufferFloat && textureFloat ? 4 : 2
            },
            postprocessing: {
                ...c.props.postprocessing,
                occlusion: aoProps.name === 'on'
                    ? { name: 'on', params: { ...aoProps.params, samples: 128 } }
                    : aoProps
            },
            marking: { ...c.props.marking }
        });

        return ip.getImageData(width, height);
    }

    getRadius() {
        return this.baseRadius * this.radiusRatio;
    }

    async hideAll(base: string) {
        await this.hideDensityMap(base);
        await this.hideStructure(base);
    }

    async hideDensityMap(base: string) {
        const state = this.plugin.state.data;
        const ref = base + '_visual';
        const b = state.build().delete(ref);

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async hideStructure(base: string, substructures?: ST.SubstructureType[]) {
        const state = this.plugin.state.data;

        const b = state.build();
        for (const st of (substructures ?? this.substructureTypes)) {
            const ref = this.mkVisRef(base, st);
            b.delete(ref);
        }

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
        this.setBaseRadius();
    }

    async hideSubstructure(base: string, st: ST.SubstructureType) {
        const state = this.plugin.state.data;

        const ref = this.mkVisRef(base, st);
        const b = state.build().delete(ref);

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
        this.setBaseRadius();
    }

    async loadDensityMap(data: Uint8Array, ref: string) {
        const b = this.plugin.state.data.build().toRoot()
            .apply(RawData, { data }, { ref: ref + '_data' })
            .apply(StateTransforms.Data.ParseCcp4)
            .apply(StateTransforms.Volume.VolumeFromCcp4, {}, { ref: ref + '_volume' });

        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });
    }

    async loadStructure(data: string, ref: string) {
        const b = this.plugin.state.data.build().toRoot()
            .apply(RawData, { data }, { ref: ref + '_data' })
            .apply(StateTransforms.Model.TrajectoryFromPDB)
            .apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 })
            .apply(StateTransforms.Model.StructureFromModel, {}, { ref: ref + '_structure' });

        // Add the entire structure first so we can make selections
        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });

        const structureCell = this.plugin.state.data.cells.get(ref + '_structure')!;
        let bb = this.plugin.state.data.build().to(structureCell);
        bb = this.loadSubstructure(bb, structureCell, 'nucleic', ref);
        bb = this.loadSubstructure(bb, structureCell, 'water', ref);
        bb = this.loadSubstructure(bb, structureCell, 'protein', ref);
        bb = this.loadSubstructure(bb, structureCell, 'ligand', ref);

        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: bb });
    }

    isoRange(ref: string) {
        const cell = this.plugin.state.data.cells.get(ref + '_volume')!;

        // Allow me a question here.
        // How is a person who does not suffer from a personality disorder
        // supposed to figure this out?
        const stats = (cell.obj!.data as Volume).grid.stats;

        return { min: stats.min, max: stats.max };
    }

    extraStructurePartRepresentation(type: ST.NonNucleicType, ref: string): ST.SubstructureRepresentation | null {
        if (this.plugin.state.data.cells.get(this.mkStructRef(ref, type))?.obj?.data === undefined)
            return null; // Given structure does not contain given kind of non-nucleic data
        const cell = this.plugin.state.data.cells.get(this.mkVisRef(ref, type));
        if (cell === undefined)
            return 'off';
        return cell.params?.values.type.name ?? 'off';
    }

    resetCamera(radiusRatio?: number) {
        if (radiusRatio)
            this.radiusRatio = radiusRatio;
        PluginCommands.Camera.Reset(this.plugin, { durationMs: AnimationDurationMsec, snapshot: { radius: this.baseRadius * this.radiusRatio } });
    }

    async setCamClipRadius(radiusRatio: number) {
        this.radiusRatio = radiusRatio;
        this.updateClipping();
    }

    async setDensityMapAppearance(iso: number, style: FragmentDescription.MapStyle, color: Color, ref: string) {
        const visualRef = ref + '_visual';
        const state = this.plugin.state.data;
        const cell = state.cells.get(visualRef);
        if (!cell)
            return;

        const type = { name: 'isosurface', params: this.densityMapParams(iso, style) };
        const colorTheme = { name: 'uniform', params: this.densityMapColors(color) };
        const b = state.build().to(cell)
            .update(StateTransforms.Representation.VolumeRepresentation3D, old => ({ ...old, colorTheme, type }));

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async setNonNucleicAppearance(type: ST.NonNucleicType, repr: ST.SubstructureRepresentation, color: Color, colorTheme: ColorTheme.BuiltIn, ref: string) {
        if (repr === 'off') {
            await this.hideSubstructure(ref, type);
            return;
        }

        const actualColor = Coloring.nonNucleicColor(type, color);
        const reprTheme = { name: repr, params: { sizeFactor: 0.2, sizeAspectRatio: 0.35 } };
        const coloringTheme = { name: colorTheme, params: this.colorThemeParams(actualColor, colorTheme) };

        const state = this.plugin.state.data;
        const visRef = this.mkVisRef(ref, type);
        if (!state.cells.has(visRef)) {
            let b = state.build().to(this.mkStructRef(ref, type));
            b = this.showSubstructure(
                state,
                b,
                ref,
                type,
                reprTheme,
                coloringTheme
            );

            await PluginCommands.State.Update(this.plugin, { state, tree: b });
        } else {
            const b = state.build()
                .to(visRef)
                .update(
                    StateTransforms.Representation.StructureRepresentation3D,
                    old => ({
                        ...old,
                        type: reprTheme,
                        colorTheme: coloringTheme
                    })
                );

            await PluginCommands.State.Update(this.plugin, { state, tree: b });
        }
    }

    async setStructureAppearance(appearances: StructureAppearance[], ref: string) {
        const state = this.plugin.state.data;

        let b = state.build().to(ref + '_structure');

        for (const { kind, repr, colorTheme, color } of appearances) {
            const visRef = this.mkVisRef(ref, kind);
            if (!state.cells.has(visRef))
                continue;

            b = this.setSubstructureAppearance(
                state,
                b,
                ref,
                kind,
                { name: repr, params: { sizeFactor: 0.2, sizeAspectRatio: 0.35 } },
                { name: colorTheme, params: this.colorThemeParams(color, colorTheme) }
            );
        }

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showDensityMap(base: string, iso: number, style: FragmentDescription.MapStyle, color: Color) {
        const ref = base + '_visual';
        const parent = base + '_volume';
        const state = this.plugin.state.data;
        if (state.transforms.has(ref) || !state.transforms.has(parent))
            return;

        const cell = state.cells.get(parent)!;
        const type = { name: 'isosurface', params: this.densityMapParams(iso, style) };
        const colorTheme = { name: 'uniform', params: this.densityMapColors(color) };
        const b = this.plugin.state.data.build().to(cell)
            .apply(StateTransforms.Representation.VolumeRepresentation3D, { colorTheme, type }, { ref });

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showStructure(base: string, color: Color, nucleicTheme: ColorTheme.BuiltIn, waterTheme: ColorTheme.BuiltIn, showWaters: boolean) {
        const structure = base + '_structure';
        const state = this.plugin.state.data;

        if (!state.transforms.has(structure))
            return;

        let b = state.build().to(structure);
        if (!state.transforms.has(this.mkVisRef(base, 'nucleic'))) {
            b = this.showSubstructure(
                state,
                b,
                base,
                'nucleic',
                { name: 'ball-and-stick', params: { sizeFactor: 0.2, sizeAspectRatio: 0.35 } },
                { name: nucleicTheme, params: this.colorThemeParams(color, nucleicTheme) }
            );
        }
        if (showWaters && !state.transforms.has(this.mkVisRef(base, 'water'))) {
            b = this.showSubstructure(
                state,
                b,
                base,
                'water',
                { name: 'ball-and-stick', params: { sizeFactor: 0.2, sizeAspectRatio: 0.35 } },
                { name: waterTheme, params: this.colorThemeParams(color, waterTheme) }
            );
        }

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
        this.setBaseRadius();
    }

    async unload(ref: string) {
        const state = this.plugin.state.data;
        const cell = state.cells.get(ref + '_data');

        if (cell) {
            const b = state.build().delete(cell);
            await PluginCommands.State.Update(this.plugin, { state, tree: b });
        }
    }
}

export interface OnFragmentLoaded {
    (loaded: number, total: number): void;
}

export interface OnFragmentStateChanged {
    (fragId: string): void;
}

type FragmentMap = Map<string, FragmentDescription.Description>;

interface WatlasAppProps extends WatlasApp.Configuration {
    elemId: string;
}

interface WatlasAppState {
    camClipRadius: number;
    showStepWaters: boolean;
}

export class WatlasApp extends React.Component<WatlasAppProps, WatlasAppState> {
    private assignedHues: Map<string, number>;
    private viewer: WatlasViewer | null;
    private loadedFragments: string[];
    private onFragmentAdded: OnFragmentStateChanged | null = null;
    private onFragmentColorsChanged: OnFragmentStateChanged | null = null;
    private onFragmentRemoved: OnFragmentStateChanged | null = null;
    private fragments: FragmentMap;
    private hue: number;

    constructor(props: WatlasAppProps) {
        super(props);

        this.state = {
            camClipRadius: DefaultRadiusRatio,
            showStepWaters: false,
        };

        this.assignedHues = new Map();
        this.loadedFragments = [];
        this.hue = Coloring.nextHue(0);
        this.fragments = new Map();
    }

    private advancefragmentColors(base: string): { colors: Map<Resources.AllKinds, Color>, nextHue: number } {
        let hue;
        let nextHue;

        if (this.assignedHues.has(base)) {
            hue = this.assignedHues.get(base)!;
            nextHue = this.hue;
        } else {
            hue = this.hue;
            nextHue = Coloring.nextHue(hue);

            this.assignedHues.set(base, hue);
        }

        const colors = new Map<Resources.AllKinds, Color>([
            ['reference', Coloring.baseColor(hue)],
            ['base', Coloring.baseColor(hue)],
            ['nucleotide', Coloring.nucleotideColor(hue)],
            ['phosphate', Coloring.phosphateColor(hue)]
        ]);

        return { colors, nextHue };
    }

    private async changeColor(clr: number, kind: Resources.AllKinds, base: string) {
        const color = Color(clr);
        const frag = this.fragments.get(base)!;
        frag.colors.set(kind, color);

        /* Make sure that reference and base colors are the same as it is the current consensus */
        if (kind === 'base')
            frag.colors.set('reference', color);
        else if (kind === 'reference')
            frag.colors.set('base', color);

        const stru = frag.structures.get(kind)!;
        const resRef = baseRefToResRef(base, kind, 'structure');
        if (stru.shown) {
            const colorTheme = kind === 'reference' ? 'element-symbol' : 'uniform';
            await this.viewer!.setStructureAppearance(
                [
                    { kind: 'nucleic', repr: 'ball-and-stick', colorTheme, color },
                    { kind: 'water',  repr: 'ball-and-stick', colorTheme: 'uniform', color }
                ],
                resRef
            );
        }

        const dmRef = kind as Resources.DensityMaps;
        if (Array.from(frag.densityMaps.keys()).includes(dmRef)) {
            const dm = frag.densityMaps.get(dmRef)!;
            if (dm.shown)
                await this.viewer!.setDensityMapAppearance(dm.iso, dm.style, color, baseRefToResRef(base, dmRef, 'density-map'));
        }

        if (kind === 'base')
            this.assignedHues.set(base, Colors.colorToHsv(clr).h);

        this.forceUpdate();

        if (this.onFragmentColorsChanged)
            this.onFragmentColorsChanged(frag.fragId);
    }

    private densityMapData(base: string, kind: Resources.DensityMaps) {
        const frag = this.fragments.get(base)!;

        return frag.densityMaps.get(kind)!;
    }

    private async dispose(fragId: string, disposer: (ref: string) => Promise<void>) {
        if (!this.viewer)
            return;

        const frag = this.fragments.get(fragId)!;

        const dkeys = Array.from(frag.densityMaps.keys());
        for (const k of dkeys) {
            const ref = baseRefToResRef(fragId, k, 'density-map');
            await disposer(ref);
        }

        const skeys = Array.from(frag.structures.keys());
        for (const k of skeys) {
            const ref = baseRefToResRef(fragId, k, 'structure');
            await disposer(ref);
        };

        this.fragments.delete(fragId);

        this.forceUpdate();
    }

    private isLoaded(fragId: string) {
        return this.loadedFragments.includes(fragId);
    }

    private async repaintStructures(frag: FragmentDescription.Description, ref: string) {
        for (const struRef of Array.from(frag.structures.keys())) {
            const stru = frag.structures.get(struRef)!;
            const resRef = baseRefToResRef(ref, struRef, 'structure');
            const color = frag.colors.get(struRef)!;

            if (stru.shown) {
                const colorTheme = struRef === 'reference' ? 'element-symbol' : 'uniform';
                const appearances: StructureAppearance[] = [{ kind: 'nucleic', repr: 'ball-and-stick', colorTheme, color }];
                if (struRef !== 'reference')
                    appearances.push({ kind: 'water',  repr: 'ball-and-stick', colorTheme: 'uniform', color });

                await this.viewer!.setStructureAppearance(appearances, resRef);
            }
        }

        const extraSt: ST.NonNucleicType[] = ['protein', 'ligand'];
        if (this.props.treatReferenceAsExtraPart && frag.structures.get('reference')!.shown)
            extraSt.push('water');

        const bResRef = baseRefToResRef(ref, 'reference', 'structure')
        const bColor = frag.colors.get('reference')!;
        for (const st of extraSt) {
            const repr = frag.extraStructurePartsRepresentations.get(st)!;
            if (repr && repr !== 'off')
                await this.viewer!.setNonNucleicAppearance(st, repr, bColor, 'uniform', bResRef);
        }
    }

    private async resetColors() {
        this.assignedHues.clear();

        this.hue = Coloring.nextHue(0);

        for (const ref of Array.from(this.fragments.keys())) {
            const frag = this.fragments.get(ref)!;
            frag.colors = new Map<Resources.AllKinds, Color>([
                ['reference', Coloring.baseColor(this.hue)],
                ['base', Coloring.baseColor(this.hue)],
                ['nucleotide', Coloring.nucleotideColor(this.hue)],
                ['phosphate', Coloring.phosphateColor(this.hue)],
            ]);

            await this.repaintStructures(frag, ref);

            for (const dmRef of Array.from(frag.densityMaps.keys())) {
                const dm = frag.densityMaps.get(dmRef)!;
                if (dm.shown)
                    await this.viewer!.setDensityMapAppearance(dm.iso, dm.style, frag.colors.get(dmRef)!, baseRefToResRef(ref, dmRef, 'density-map'));
            }

            this.assignedHues.set(ref, this.hue);
            this.hue = Coloring.nextHue(this.hue);

            if (this.onFragmentColorsChanged)
                this.onFragmentColorsChanged(frag.fragId);
        }

        this.forceUpdate();
    }

    private async saveViewAsImage(width: number, height: number, transparentBackground: boolean) {
        if (!this.viewer)
            return;

        const imgData = this.viewer.getCanvasImage(width, height, transparentBackground);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) {
            console.warn('Could not create 2D canvas context');
            return;
        }
        canvasCtx.putImageData(imgData, 0, 0);

        canvas.toBlob(
            blob => {
                if (!blob) {
                    console.warn('no image data');
                    return;
                }

                downloadFile(blob, 'watna_snapshot.png');
            },
            'png',
            95
        );
    }

    private setNonNucleicAppearance(repr: ST.SubstructureRepresentation, type: ST.NonNucleicType, base: string) {
        const frag = this.fragments.get(base)!;

        const color = this.fragments.get(base)!.colors.get('reference')!;
        const ref = baseRefToResRef(base, 'reference', 'structure');
        frag.extraStructurePartsRepresentations.set(type, repr);
        this.viewer!.setNonNucleicAppearance(type, repr, color, 'uniform', ref);

        this.forceUpdate();
    }

    private async showFragmentInitial(frag: FragmentDescription.Description, isOnlyFragment: boolean) {
        for (const [kind, stru] of Array.from(frag.structures.entries())) {
            if (stru.shown) {
                const color = frag.colors.get(kind)!;
                const ref = baseRefToResRef(frag.fragId, kind, 'structure');
                await this.viewer!.showStructure(ref, color, kind === 'reference' ? 'element-symbol' : 'uniform', 'uniform', kind !== 'reference');
            }
        }
        for (const [kind, dm] of Array.from(frag.densityMaps.entries())) {
            if (dm.shown) {
                const color = frag.colors.get(kind)!;
                const ref = baseRefToResRef(frag.fragId, kind, 'density-map');
                await this.viewer!.showDensityMap(ref, dm.iso, dm.style, color);
            }
        }
        for (const [type, repr] of Array.from(frag.extraStructurePartsRepresentations.entries())) {
            if (repr && repr !== 'off') {
                const color = frag.colors.get('reference')!;
                const ref = baseRefToResRef(frag.fragId, 'reference', 'structure');
                await this.viewer!.setNonNucleicAppearance(type, repr, color, 'uniform', ref);
            }
        }

        if (isOnlyFragment)
            this.viewer!.resetCamera();
    }

    private updateFragmentDensityMap(data: FragmentDescription.DensityMap, base: string, kind: Resources.DensityMaps) {
        const frag = this.fragments.get(base)!;
        frag.densityMaps.set(kind, data);

        this.forceUpdate();
    }

    private updateFragmentStructure(data: FragmentDescription.Structure, base: string, kind: Resources.Structures) {
        const frag = this.fragments.get(base)!;
        frag.structures.set(kind, data);

        this.forceUpdate();
    }

    componentDidMount() {
        const elem = document.getElementById(this.props.elemId + '-viewer');
        if (!elem)
            throw new Error('No element to render viewer');

        if (!this.viewer)
            this.viewer = new WatlasViewer(elem);

        WatlasViewerApi.bind(this, this.props.elemId);

        this.forceUpdate(); /* Necessary to make sure that we pass the Molstar plugin to Measurements */
    }

    async add(fragId: string, paths: Resources.Paths, referenceName: { text: string; transform: boolean }, shownStructures: Resources.Structures[], shownDensityMaps: Resources.DensityMaps[]) {
        if (!this.viewer)
            return;

        if (!this.isLoaded(fragId))
            await this.load([{ fragId, paths }]);

        if (this.fragments.has(fragId))
            return;

        const baseWaterMapIsoRange = this.viewer.isoRange(baseRefToResRef(fragId, 'base', 'density-map'));
        const stepWaterMapIsoRange = this.viewer.isoRange(baseRefToResRef(fragId, 'nucleotide', 'density-map'));
        const phosWaterMapIsoRange = this.viewer.isoRange(baseRefToResRef(fragId, 'phosphate', 'density-map'));

        const structures: Map<Resources.Structures, FragmentDescription.Structure> = new Map([
            ['reference', { shown: shownStructures.includes('reference') }],
            ['base', { shown: shownStructures.includes('base') }],
            ['nucleotide', { shown: shownStructures.includes('nucleotide') }],
            ['phosphate', { shown: shownStructures.includes('phosphate') }],
        ]);
        const densityMaps: Map<Resources.DensityMaps, FragmentDescription.DensityMap> = new Map([
            ['base', {
                shown: shownDensityMaps.includes('base'),
                iso: WatNAUtil.prettyIso(WatNAUtil.mid(baseWaterMapIsoRange), WatNAUtil.isoBounds(baseWaterMapIsoRange.min, baseWaterMapIsoRange.max).step),
                isoRange: baseWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
            ['nucleotide', {
                shown: shownDensityMaps.includes('nucleotide'),
                iso: WatNAUtil.prettyIso(WatNAUtil.mid(stepWaterMapIsoRange), WatNAUtil.isoBounds(stepWaterMapIsoRange.min, stepWaterMapIsoRange.max).step),
                isoRange: stepWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
            ['phosphate', {
                shown: shownDensityMaps.includes('phosphate'),
                iso: WatNAUtil.prettyIso(WatNAUtil.mid(phosWaterMapIsoRange), WatNAUtil.isoBounds(phosWaterMapIsoRange.min, phosWaterMapIsoRange.max).step),
                isoRange: phosWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
        ]);
        const { colors, nextHue } = this.advancefragmentColors(fragId);

        const nnRef = baseRefToResRef(fragId, 'reference', 'structure');
        const extraStructurePartsRepresentations = new Map<ST.NonNucleicType, ST.SubstructureRepresentation | null>([
            ['water', this.viewer.extraStructurePartRepresentation('water', nnRef) === null ? null : 'ball-and-stick'],
            ['ligand', this.viewer.extraStructurePartRepresentation('ligand', nnRef) === null ? null : 'off'],
            ['protein', this.viewer.extraStructurePartRepresentation('protein', nnRef) === null ? null : 'cartoon'],
        ]);
        const frag: FragmentDescription.Description = {
            fragId,
            referenceName,
            structures,
            densityMaps,
            colors,
            extraStructurePartsRepresentations,
        };
        const newFragments: FragmentMap = new Map([[fragId, frag]]);

        await this.showFragmentInitial(frag, this.fragments.size === 0);

        this.fragments = new Map(
            [
                ...Array.from(this.fragments.entries()),
                ...Array.from(newFragments.entries())
            ]
        );
        this.hue = nextHue;

        this.forceUpdate();

        if (this.onFragmentAdded)
            this.onFragmentAdded(fragId);
    }

    forceRerender() {
        this.forceUpdate();
        if (this.viewer?.plugin)
            this.viewer.plugin.handleResize();
    }

    fragmentColors(fragId: string, format: 'style' | 'rgb'): ColorInfo | undefined {
        const frag = this.fragments.get(fragId);
        if (!frag)
            return;

        switch (format) {
            case 'style':
                return {
                    base: Color.toStyle(frag.colors.get('base')!),
                    phosphate: Color.toStyle(frag.colors.get('phosphate')!),
                    nucleotide: Color.toStyle(frag.colors.get('nucleotide')!),
                };
            case 'rgb':
                return {
                    base: Color.toRgb(frag.colors.get('base')!),
                    phosphate: Color.toRgb(frag.colors.get('phosphate')!),
                    nucleotide: Color.toRgb(frag.colors.get('nucleotide')!),
                };
        }
    }

    has(fragId: string) {
        return this.fragments.has(fragId);
    }

    async load(fragments: { fragId: string, paths: Resources.Paths }[], callback?: OnFragmentLoaded) {
        if (!this.viewer)
            return;

        const pending: { fragId: string, prom: Promise<DownloadedResource[]>}[] = [];

        for (const frag of fragments) {
            if (this.isLoaded(frag.fragId))
                continue;
            const links = Resources.makeLinks(frag.paths);
            pending.push({ fragId: frag.fragId, prom: download(links) });
        }

        let errors: string[] = [];
        let ctr = 0;
        for (const p of pending) {
            try {
                const resources = await p.prom;

                for (const r of resources) {
                    if (r.type === 'density-map')
                        await this.viewer!.loadDensityMap(r.data as Uint8Array, mkResRef(p.fragId, r.kind, 'density-map'));
                    else
                        await this.viewer!.loadStructure(r.data as string, mkResRef(p.fragId, r.kind, 'structure'));
                }

                this.loadedFragments.push(p.fragId);
            } catch (e) {
                errors = errors.concat(e);
            } finally {
                if (callback)
                    callback(++ctr, fragments.length);
            }
        }

        if (errors.length > 0)
            throw errors;
    }

    async remove(fragId: string) {
        await this.dispose(fragId, ref => this.viewer!.hideAll(ref));
        if (this.onFragmentRemoved)
            this.onFragmentRemoved(fragId);
    }

    setOnFragmentAddedCallback(callback: OnFragmentStateChanged) {
        this.onFragmentAdded = callback;
    }

    setOnFragmentColorsChangedCallback(callback: OnFragmentStateChanged) {
        this.onFragmentColorsChanged = callback;
    }

    setOnFragmentRemovedCallback(callback: OnFragmentStateChanged) {
        this.onFragmentRemoved = callback;
    }

    async unload(fragId: string) {
        await this.dispose(fragId, ref => this.viewer!.unload(ref));

        this.loadedFragments = this.loadedFragments.filter(v => v !== fragId);

        if (this.onFragmentRemoved)
            this.onFragmentRemoved(fragId);
    }

    render() {
        return (
            <div className='wnav-app-container'>
                <div id={this.props.elemId + '-viewer'} className='wnav-viewer'></div>
                <Measurements
                    plugin={this.viewer?.plugin}
                    orientation='vertical'
                    pathPrefix={this.props.pathPrefix ?? ''}
                />
                <Collapsible
                    caption='Controls'
                    orientation='vertical'
                    initialState='expanded'
                    dontGrow={true}
                    onStateChanged={() => {
                        /* Schedule resizing trigger from a timeout to hopefully prevent races */
                        setTimeout(Util.triggerResize, 10);
                    }}
                    pathPrefix={this.props.pathPrefix ?? ''}
                >
                    <div className='wnav-ctrl-panel'>
                        <List
                            fragments={this.fragments}
                            showStepWaters={this.state.showStepWaters}
                            onChangeColor={(clr, kind, base) => this.changeColor(clr, kind, base)}
                            onChangeNonNucleicAppearance={(repr, type, base) => this.setNonNucleicAppearance(repr, type, base)}
                            onDensityMapIsoChanged={(iso, kind, base) => {
                                const ref = baseRefToResRef(base, kind, 'density-map');
                                const frag = this.fragments.get(base)!;
                                const dm = this.densityMapData(base, kind);

                                this.viewer!.setDensityMapAppearance(iso, dm.style, frag.colors.get(kind)!, ref);

                                this.updateFragmentDensityMap({ ...dm, iso }, base, kind);
                            }}
                            onDensityMapStyleChanged={(style, kind, base) => {
                                const ref = baseRefToResRef(base, kind, 'density-map');
                                const frag = this.fragments.get(base)!;
                                const dm = this.densityMapData(base, kind);

                                this.viewer!.setDensityMapAppearance(dm.iso, style, frag.colors.get(kind)!, ref);

                                this.updateFragmentDensityMap({ ...dm, style }, base, kind);
                            }}
                            onHideShowResource={(show, kind, type, base) => {
                                const frag = this.fragments.get(base)!;
                                const ref = baseRefToResRef(base, kind, type);

                                if (type === 'density-map') {
                                    const dm = frag.densityMaps.get(kind as Resources.DensityMaps)!;
                                    if (show) {
                                        const color = frag.colors.get(kind)!;
                                        this.viewer!.showDensityMap(ref, dm.iso, dm.style, color);
                                    } else
                                        this.viewer!.hideDensityMap(ref);

                                    this.updateFragmentDensityMap({ ...dm, shown: show }, base, kind as Resources.DensityMaps);
                                } else {
                                    const stru = frag.structures.get(kind)!;
                                    if (show) {
                                        const color = frag.colors.get(kind)!;
                                        this.viewer!.showStructure(ref, color, kind === 'reference' ? 'element-symbol' : 'uniform', 'uniform', kind !== 'reference');
                                    } else
                                        this.viewer!.hideStructure(ref, kind === 'reference' && this.props.treatReferenceAsExtraPart ? ['nucleic'] : undefined);

                                    this.updateFragmentStructure({ ...stru, shown: show }, base, kind);
                                }
                            }}
                            onRemoveClicked={base => {
                                const frag = this.fragments.get(base)!;
                                this.remove(frag.fragId);
                            }}
                            hydrationSitesName={this.props.hydrationSitesName}
                            hydrationDistributionName={this.props.hydrationDistributionName}
                            nucleotideWatersName={this.props.nucleotideWatersName}
                            extraStructurePartsName={this.props.extraStructurePartsName}
                            extraStructurePartsPlacement={this.props.extraStructurePartsPlacement}
                            treatReferenceAsExtraPart={this.props.treatReferenceAsExtraPart}
                            pathPrefix={this.props.pathPrefix ?? ''}
                        />
                        <Controls
                            disableStepWaters={this.props.disableStepWaters}
                            camClipRadius={this.state.camClipRadius}
                            getCanvasSize={() => {
                                const elem = document.querySelector(`#${this.props.elemId}-viewer`);
                                if (elem)
                                    return { width: elem.clientWidth, height: elem.clientHeight };
                                return { width: 0, height: 0 };
                            }}
                            showStepWaters={this.state.showStepWaters}
                            onCamClipRadiusChanged={radius => {
                                this.viewer!.setCamClipRadius(radius);
                                this.setState({ ...this.state, camClipRadius: radius });
                            }}
                            onHideShowStepWaters={show => {
                                if (!show) {
                                    for (const [base, frag] of Array.from(this.fragments.entries())) {
                                        const stru = frag.structures.get('nucleotide')!;
                                        if (stru.shown)
                                            this.viewer!.hideStructure(baseRefToResRef(base, 'nucleotide', 'structure'));

                                        const dm = frag.densityMaps.get('nucleotide')!;
                                        if (dm.shown)
                                            this.viewer!.hideDensityMap(baseRefToResRef(base, 'nucleotide', 'density-map'));
                                    }
                                } else {
                                    for (const [base, frag] of Array.from(this.fragments.entries())) {
                                        const color = frag.colors.get('nucleotide')!;
                                        const stru = frag.structures.get('nucleotide')!;
                                        if (stru.shown)
                                            this.viewer!.showStructure(baseRefToResRef(base, 'nucleotide', 'structure'), color, 'uniform', 'uniform', true);

                                        const dm = frag.densityMaps.get('nucleotide')!;
                                        if (dm.shown)
                                            this.viewer!.showDensityMap(baseRefToResRef(base, 'nucleotide', 'density-map'), dm.iso, dm.style, color);
                                    }
                                }

                                this.setState({ ...this.state, showStepWaters: show });
                            }}
                            onResetCamera={() => {
                                if (this.viewer)
                                    this.viewer.resetCamera(DefaultRadiusRatio);
                                this.setState({ ...this.state, camClipRadius: DefaultRadiusRatio });
                            }}
                            onResetColors={() => this.resetColors()}
                            onSaveViewAsImage={(width, height, transparentBackground) => this.saveViewAsImage(width, height, transparentBackground)}
                            nucleotideWatersName={this.props.nucleotideWatersName}
                            pathPrefix={this.props.pathPrefix ?? ''}
                        />
                    </div>
                </Collapsible>
            </div>
        );
    }
}

export namespace WatlasApp {
    export interface Configuration {
        /* Text to display as caption of the extra structure part controls block */
        extraStructurePartsName: string;
        /* Text to display as caption of the hydration sites controls block */
        hydrationSitesName: string;
        /* Text to display as caption of the hydration distribution controls block */
        hydrationDistributionName: string;
        /* Name to display for the nucleotide (step) waters */
        nucleotideWatersName: string;
        /* If true, reference structure controls will be displayed in the extra structure part controls block */
        treatReferenceAsExtraPart: boolean;
        /* Where to place the extra structure part controls block (on top or the bottom of the entire FragmentControls element */
        extraStructurePartsPlacement: 'first' | 'last';
        /* If true, the step waters will not be displayed */
        disableStepWaters: boolean;
        /* Path prefix, used to amend assets URLs */
        pathPrefix?: string;
    }

    export function init(elemId: string, configuration: Configuration) {
        const elem = document.getElementById(elemId);
        if (!elem)
            throw new Error(`Element ${elemId} does not exist`);

        ReactDOM.render(<WatlasApp {...configuration} elemId={elemId} />, elem);
    }
}
