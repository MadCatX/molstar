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
import { ColorUtil } from './color-util';
import { Controls } from './controls';
import { RepresentationControlsStyle } from './fragment-controls';
import { FragmentDescription as FD } from './fragment-description';
import { List } from './list';
import { Resources } from './resources';
import { WatNAUtil } from './watna-util';
import * as ST from './substructure-types';
import { Collapsible } from '../watlas-common/collapsible';
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
import { createPluginUI } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { RawData } from '../../mol-plugin-state/transforms/data';
import { Representation } from '../../mol-repr/representation';
import { Script } from '../../mol-script/script';
import { StateObjectCell } from '../../mol-state';
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
const DefaultDensityMapRepr = 'wireframe';
const DefaultSubstructureReprs: Record<ST.SubstructureType, FD.StructureRepresentation | FD.OffRepresentation> = {
    'nucleic': 'ball-and-stick',
    'ligand': 'ball-and-stick',
    'protein': 'cartoon',
    'water': 'ball-and-stick',
};
const DefaultRadiusRatio = 1.0;
const SelectAllScript = Script('(sel.atom.atoms true)', 'mol-script');
const SphereBoundaryHelper = new BoundaryHelper('98');

const NonNuclecSubstructureTypes: ST.NonNucleicType[] = [
    'water',
    'protein',
    'ligand'
];
const SubstructureTypes: ST.SubstructureType[] = [
    'nucleic',
    ...NonNuclecSubstructureTypes
];

export type ColorInfo = {
    reference: string | [ number, number, number ],
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

function mapStyleToVisuals(style: FD.MapRepresentation) {
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

function reprIsOn<T>(repr: T | FD.OffRepresentation): repr is T {
    return repr !== 'off';
}

type DownloadedResource = {
    data: string|Uint8Array;
    kind: Resources.AllKinds;
    type: Resources.Type
};

type SubstructureAppearance = {
    substru: ST.SubstructureType;
    repr: FD.StructureRepresentation;
    colorTheme: ColorTheme.BuiltIn;
    color: Color;
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
    readonly visualTagTails = SubstructureTypes.map(e => this.mkVisRef('', e));

    baseRadius: number = 0;
    radiusRatio: number = DefaultRadiusRatio;

    constructor(public plugin: PluginUIContext) {
    }

    static async create(target: HTMLElement) {
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

        const plugin = await createPluginUI(target, spec);

        plugin.managers.interactivity.setProps({ granularity: 'element' });
        plugin.selectionMode = true;

        return new WatlasViewer(plugin);
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

    private densityMapParams(iso: number, style: FD.MapRepresentation) {
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
        return base + '_model-structure' + '_' + st;
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

    hasSubstructure(substru: ST.SubstructureType, base: string) {
        const ref = this.mkStructRef(base, substru);
        return this.plugin.state.data.cells.get(ref)?.obj?.data !== undefined;
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
        for (const st of (substructures ?? SubstructureTypes)) {
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
            .apply(StateTransforms.Model.StructureFromModel, {}, { ref: ref + '_model-structure' });

        // Add the entire structure first so we can make selections
        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });

        const structureCell = this.plugin.state.data.cells.get(ref + '_model-structure')!;
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

    async modifyDensityMap(base: string, iso: number, repr: FD.MapRepresentation | FD.OffRepresentation, color: Color) {
        if (repr === 'off')
            await this.hideDensityMap(base);
        else
            await this.showDensityMap(base, iso, repr, color);
    }

    resetCamera(radiusRatio?: number) {
        if (radiusRatio)
            this.radiusRatio = radiusRatio;
        PluginCommands.Camera.Reset(this.plugin, { durationMs: AnimationDurationMsec, snapshot: { radius: this.baseRadius * this.radiusRatio, fog: 0 } });
    }

    async setCamClipRadius(radiusRatio: number) {
        this.radiusRatio = radiusRatio;
        this.updateClipping();
    }

    async showDensityMap(base: string, iso: number, representation: FD.MapRepresentation, color: Color) {
        const ref = base + '_visual';
        const parent = base + '_volume';
        const state = this.plugin.state.data;
        if (!state.transforms.has(parent))
            return;

        const type = { name: 'isosurface', params: this.densityMapParams(iso, representation) };
        const colorTheme = { name: 'uniform', params: this.densityMapColors(color) };
        const b = state.build().toRoot();
        if (!state.transforms.has(ref)) {
            const cell = state.cells.get(parent)!;
            b.to(cell).apply(StateTransforms.Representation.VolumeRepresentation3D, { colorTheme, type }, { ref });
        } else {
            b.to(ref).update(
                StateTransforms.Representation.VolumeRepresentation3D,
                old => (
                    {
                        ...old,
                        colorTheme,
                        type
                    }
                )
            );
        }

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showStructure(base: string, appearances: SubstructureAppearance[]) {
        const structure = base + '_model-structure';
        const state = this.plugin.state.data;
        if (!state.transforms.has(structure))
            return;

        const b = state.build();

        for (const a of appearances) {
            const struRef = this.mkStructRef(base, a.substru);
            if (!state.transforms.has(struRef))
                continue;
            const ref = this.mkVisRef(base, a.substru);
            const reprParams = { name: a.repr, params: { sizeFactor: 0.2, sizeAspectRatio: 0.35 } };
            const theme = (a.repr !== 'ball-and-stick' && a.colorTheme === 'element-symbol') ? 'uniform' : a.colorTheme;
            const colorParams = { name: theme, params: this.colorThemeParams(a.color, theme) }
            if (!state.transforms.has(ref)) {
                b.to(struRef)
                    .apply(
                        StateTransforms.Representation.StructureRepresentation3D,
                        {
                            type: reprParams,
                            colorTheme: colorParams
                        },
                        { ref }
                    );
            } else {
                b.to(ref).update(
                    StateTransforms.Representation.StructureRepresentation3D,
                    old => (
                        {
                            ...old,
                            type: reprParams,
                            colorTheme: colorParams
                        }
                    )
                );
            }
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

type FragmentMap = Map<string, FD.Description>;

interface WatlasAppProps extends WatlasApp.Configuration {
    elemId: string;
}

interface WatlasAppState {
    camClipRadius: number;
    showStepWaters: boolean;
}

export class WatlasApp extends React.Component<WatlasAppProps, WatlasAppState> {
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

        this.loadedFragments = [];
        this.hue = ColorUtil.nextHue(0);
        this.fragments = new Map();
    }

    private advanceFragmentColors() {
        const hue = this.hue;
        const nextHue = ColorUtil.nextHue(hue);

        return { colors: this.mkAutoColors(hue), nextHue };
    }

    private async changeColor(clr: number, kind: Resources.AllKinds, substru: ST.SubstructureType, base: string) {
        const color = Color(clr);
        const frag = this.fragments.get(base)!;

        const coloring = frag.colors.get(kind)!.get(substru);
        if (!coloring) {
            console.warn(`Attempted to get non-existent Coloring ${kind}/${substru}`);
            return;
        }

        coloring.color = color;
        frag.colors.get(kind)!.set(substru, coloring);

        await this.drawStructures(frag);
        await this.drawDensityMaps(frag);

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

    private async drawDensityMaps(frag: FD.Description) {
        for (const dmRef of Array.from(frag.densityMaps.keys())) {
            const dm = frag.densityMaps.get(dmRef)!;
            if (reprIsOn(dm.representation)) {
                const coloring = frag.colors.get(dmRef)!.get('water')!;
                await this.viewer!.showDensityMap(baseRefToResRef(frag.fragId, dmRef, 'density-map'), dm.iso, dm.representation, coloring.color);
            }
        }
    }

    private async drawStructures(frag: FD.Description) {
        for (const [kind, structs] of Array.from(frag.structures.entries())) {
            const ref = baseRefToResRef(frag.fragId, kind, 'structure');
            const appearances: SubstructureAppearance[] = [];
            for (const [substru, stru] of Array.from(structs.entries())) {
                if (reprIsOn(stru.representation)) {
                    const coloring = frag.colors.get(kind)!.get(substru)!;
                    appearances.push(
                        {
                            substru: substru,
                            repr: stru.representation,
                            color: coloring.color,
                            colorTheme: coloring.theme,
                        }
                    );
                }
            }

            await this.viewer!.showStructure(ref, appearances);
        }
    }

    private isLoaded(fragId: string) {
        return this.loadedFragments.includes(fragId);
    }

    private mkAutoColors(hue: number) {
        return new Map<Resources.AllKinds, Map<ST.SubstructureType, FD.Coloring>>([
            [
                'reference', new Map<ST.SubstructureType, FD.Coloring>([
                    ['nucleic', { color: ColorUtil.autoBaseColor(hue), theme: 'element-symbol' }],
                    ['ligand', { color: ColorUtil.autoLigandColor(hue), theme: 'element-symbol' }],
                    ['protein', { color: ColorUtil.autoProteinColor(hue), theme: 'uniform' }],
                    ['water', { color: ColorUtil.autoWaterColor(hue), theme: 'uniform' }],
                ])
            ],
            [
                'base', new Map<ST.SubstructureType, FD.Coloring>([
                    ['water', { color: ColorUtil.autoBaseColor(hue), theme: 'uniform' }],
                ])
            ],
            [
                'nucleotide', new Map<ST.SubstructureType, FD.Coloring>([
                    ['water', { color: ColorUtil.autoNucleotideColor(hue), theme: 'uniform' }],
                ])
            ],
            [
                'phosphate', new Map<ST.SubstructureType, FD.Coloring>([
                    ['water', { color: ColorUtil.autoPhosphateColor(hue), theme: 'uniform' }],
                ])
            ]
        ]);
    }



    private async resetColors() {
        this.hue = ColorUtil.nextHue(0);

        for (const ref of Array.from(this.fragments.keys())) {
            const frag = this.fragments.get(ref)!;
            frag.colors = this.mkAutoColors(this.hue);

            await this.drawStructures(frag);
            await this.drawDensityMaps(frag);

            this.hue = ColorUtil.nextHue(this.hue);

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

    private async showFragmentInitial(frag: FD.Description, isOnlyFragment: boolean) {
        await this.drawStructures(frag);
        await this.drawDensityMaps(frag);

        if (isOnlyFragment)
            this.viewer!.resetCamera();
    }

    private updateFragmentDensityMap(data: FD.DensityMap, base: string, kind: Resources.DensityMaps) {
        const frag = this.fragments.get(base)!;
        frag.densityMaps.set(kind, data);

        this.forceUpdate();
    }

    private updateFragmentStructure(data: FD.Structure, substru: ST.SubstructureType, base: string, kind: Resources.Structures) {
        const frag = this.fragments.get(base)!;
        frag.structures.get(kind)!.set(substru, data);

        this.forceUpdate();
    }

    componentDidMount() {
        const elem = document.getElementById(this.props.elemId + '-viewer');
        if (!elem)
            throw new Error('No element to render viewer');

        if (!this.viewer) {
            WatlasViewer.create(elem).then(viewer => {
                this.viewer = viewer;
                WatlasViewerApi.bind(this, this.props.elemId);
                this.forceUpdate(); /* Necessary to make sure that we pass the Molstar plugin to Measurements */
                if (this.props.onViewerInitialized)
                    this.props.onViewerInitialized();
            });
        }
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

        const structures: Map<Resources.Structures, Map<ST.SubstructureType, FD.Structure>> = new Map([
            [
                'reference', new Map<ST.SubstructureType, FD.Structure>(),
            ],
            [
                'base', new Map<ST.SubstructureType, FD.Structure>(),
            ],
            [
                'nucleotide', new Map<ST.SubstructureType, FD.Structure>()
            ],
            [
                'phosphate', new Map<ST.SubstructureType, FD.Structure>(),
            ]
        ]);

        for (const s of ['reference', 'base', 'nucleotide', 'phosphate'] as Resources.Structures[]) {
            const ref = baseRefToResRef(fragId, s, 'structure')
            const item = structures.get(s)!
            for (const sub of SubstructureTypes) {
                if (this.viewer!.hasSubstructure(sub, ref))
                    item.set(sub, { representation: shownStructures.includes(s) ? DefaultSubstructureReprs[sub] : 'off' })
            }
            structures.set(s, item);
        }

        const densityMaps: Map<Resources.DensityMaps, FD.DensityMap> = new Map([
            ['base', {
                representation: shownDensityMaps.includes('base') ? DefaultDensityMapRepr : 'off',
                iso: WatNAUtil.prettyIso(WatNAUtil.mid(baseWaterMapIsoRange), WatNAUtil.isoBounds(baseWaterMapIsoRange.min, baseWaterMapIsoRange.max).step),
                isoRange: baseWaterMapIsoRange,
            }],
            ['nucleotide', {
                representation: shownDensityMaps.includes('nucleotide') ? DefaultDensityMapRepr : 'off',
                iso: WatNAUtil.prettyIso(WatNAUtil.mid(stepWaterMapIsoRange), WatNAUtil.isoBounds(stepWaterMapIsoRange.min, stepWaterMapIsoRange.max).step),
                isoRange: stepWaterMapIsoRange,
            }],
            ['phosphate', {
                representation: shownDensityMaps.includes('phosphate') ? DefaultDensityMapRepr : 'off',
                iso: WatNAUtil.prettyIso(WatNAUtil.mid(phosWaterMapIsoRange), WatNAUtil.isoBounds(phosWaterMapIsoRange.min, phosWaterMapIsoRange.max).step),
                isoRange: phosWaterMapIsoRange,
            }],
        ]);
        const { colors, nextHue } = this.advanceFragmentColors();

        const frag: FD.Description = {
            fragId,
            referenceName,
            structures,
            densityMaps,
            colors,
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
                    reference: Color.toStyle(frag.colors.get('reference')!.get('nucleic')!.color),
                    base: Color.toStyle(frag.colors.get('base')!.get('water')!.color),
                    phosphate: Color.toStyle(frag.colors.get('phosphate')!.get('water')!.color),
                    nucleotide: Color.toStyle(frag.colors.get('nucleotide')!.get('water')!.color),
                };
            case 'rgb':
                return {
                    reference: Color.toRgb(frag.colors.get('reference')!.get('nucleic')!.color),
                    base: Color.toRgb(frag.colors.get('base')!.get('water')!.color),
                    phosphate: Color.toRgb(frag.colors.get('phosphate')!.get('water')!.color),
                    nucleotide: Color.toRgb(frag.colors.get('nucleotide')!.get('water')!.color),
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
                            onChangeColor={(clr, kind, substru, base) => this.changeColor(clr, kind, substru, base)}
                            onDensityMapIsoChanged={(iso, kind, base) => {
                                const ref = baseRefToResRef(base, kind, 'density-map');
                                const frag = this.fragments.get(base)!;
                                const dm = this.densityMapData(base, kind);

                                if (reprIsOn(dm.representation))
                                    this.viewer!.showDensityMap(ref, dm.iso, dm.representation, frag.colors.get(kind)!.get('water')!.color);

                                this.updateFragmentDensityMap({ ...dm, iso }, base, kind);
                            }}
                            onChangeResourceRepresentation={(repr, kind, type, substru, base) => {
                                const frag = this.fragments.get(base)!;
                                const ref = baseRefToResRef(base, kind, type);

                                if (type === 'density-map') {
                                    const dm = frag.densityMaps.get(kind as Resources.DensityMaps)!;
                                    const color = frag.colors.get(kind)!.get(substru)!.color;
                                    if (reprIsOn(repr))
                                        this.viewer!.showDensityMap(ref, dm.iso, repr as FD.MapRepresentation, color);
                                    else
                                        this.viewer!.hideDensityMap(ref);

                                    this.updateFragmentDensityMap({ ...dm, representation: repr as FD.MapRepresentation | FD.OffRepresentation }, base, kind as Resources.DensityMaps);
                                } else {
                                    const stru = frag.structures.get(kind)!.get(substru)!;
                                    const coloring = frag.colors.get(kind)!.get(substru)!;
                                    if (reprIsOn(repr)) {
                                        const appearances: SubstructureAppearance[] = [{
                                            substru,
                                            repr: repr as FD.StructureRepresentation,
                                            color: coloring.color,
                                            colorTheme: coloring.theme,
                                        }];
                                        this.viewer!.showStructure(ref, appearances);
                                    } else
                                        this.viewer!.hideStructure(ref, [substru]);

                                    this.updateFragmentStructure({ ...stru, representation: repr as FD.StructureRepresentation | FD.OffRepresentation }, substru, base, kind);
                                }
                            }}
                            onRemoveClicked={base => {
                                const frag = this.fragments.get(base)!;
                                this.remove(frag.fragId);
                            }}
                            hydrationSitesName={this.props.hydrationSitesName}
                            hydrationDistributionName={this.props.hydrationDistributionName}
                            nucleotideWatersName={this.props.nucleotideWatersName}
                            nonNucleicStructurePartsName={this.props.nonNucleicStructurePartsName}
                            nonNucleicStructurePartsPlacement={this.props.nonNucleicStructurePartsPlacement}
                            representationControlsStyle={this.props.representationControlsStyle}
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
                            onHideShowStepWaters={async (show) => {
                                if (!show) {
                                    for (const [base, frag] of Array.from(this.fragments.entries())) {
                                        const structs = frag.structures.get('nucleotide');
                                        if (!structs)
                                            continue;
                                        const substructs = Array.from(structs.keys())
                                        await this.viewer!.hideStructure(baseRefToResRef(base, 'nucleotide', 'structure'), substructs);

                                        this.viewer!.hideDensityMap(baseRefToResRef(base, 'nucleotide', 'density-map'));
                                    }
                                } else {
                                    for (const [base, frag] of Array.from(this.fragments.entries())) {
                                        const structs = frag.structures.get('nucleotide');
                                        if (!structs)
                                            continue;

                                        const appearances: SubstructureAppearance[] = [];
                                        for (const [substru, stru] of Array.from(structs.entries())) {
                                            if (!reprIsOn(stru.representation))
                                                continue;
                                            const coloring = frag.colors.get('nucleotide')!.get(substru)!;
                                            appearances.push({
                                                substru,
                                                repr: stru.representation,
                                                color: coloring.color,
                                                colorTheme: coloring.theme,
                                            });
                                        }

                                        await this.viewer!.showStructure(baseRefToResRef(base, 'nucleotide', 'structure'), appearances);

                                        const dm = frag.densityMaps.get('nucleotide');
                                        if (!dm)
                                            continue;
                                        const coloring = frag.colors.get('nucleotide')!.get('water')!;
                                        if (reprIsOn(dm.representation))
                                            await this.viewer!.showDensityMap(baseRefToResRef(base, 'nucleotide', 'density-map'), dm.iso, dm.representation, coloring.color);

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
    export interface ViewerInitializedCallback {
        (): void;
    }

    export interface Configuration {
        representationControlsStyle: RepresentationControlsStyle;
        /* Text to display as caption of the non-nucleic structure parts control block */
        nonNucleicStructurePartsName: string;
        /* Text to display as caption of the hydration sites controls block */
        hydrationSitesName: string;
        /* Text to display as caption of the hydration distribution controls block */
        hydrationDistributionName: string;
        /* Name to display for the nucleotide (step) waters */
        nucleotideWatersName: string;
        /* Where to place the non-nucleic structure parts controls block */
        nonNucleicStructurePartsPlacement: 'first' | 'last';
        /* If true, the step waters will not be displayed */
        disableStepWaters: boolean;
        /* Path prefix, used to amend assets URLs */
        pathPrefix?: string;
        /* Function to call after the viewer initializes */
        onViewerInitialized?: ViewerInitializedCallback;
    }

    export function init(elemId: string, configuration: Configuration) {
        const elem = document.getElementById(elemId);
        if (!elem)
            throw new Error(`Element ${elemId} does not exist`);

        ReactDOM.render(<WatlasApp {...configuration} elemId={elemId} />, elem);
    }
}
