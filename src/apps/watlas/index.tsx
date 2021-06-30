/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Api } from './api';
import { Coloring } from './coloring';
import { Controls } from './controls';
import { List } from './list';
import { NtCDescription } from './ntc-description';
import { NtC, Sequence, Resources } from './resources';
import { Util } from './util';
import { Loci } from '../../mol-model/loci';
import { Volume } from '../../mol-model/volume';
import { PluginBehavior, PluginBehaviors } from '../../mol-plugin/behavior';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { PluginSpec } from '../../mol-plugin/spec';
import { LociLabel } from '../../mol-plugin-state/manager/loci-label';
import { createPlugin } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { RawData } from '../../mol-plugin-state/transforms/data';
import { Color } from '../../mol-util/color';
import { ColorTheme } from '../../mol-theme/color';
import { lociLabel } from '../../mol-theme/label';

const DefaultDensityMapAlpha = 0.5;
const DefaultDensityMapStyle = 'wireframe';

export type ColorInfo = {
    base: string | [ number, number, number ],
    phos: string | [ number, number, number ],
    step: string | [ number, number, number ],
}

export const WatlasViewerApi = new Api();
(window as any).WVApi = WatlasViewerApi;

function mkBaseRef(ntc: NtC, seq: Sequence) {
    return `${ntc}_${seq}`;
}

function mkResRef(ntc: NtC, seq: Sequence, kind: Resources.AllKinds, type: Resources.Type) {
    return baseRefToResRef(mkBaseRef(ntc, seq), kind, type);
}

function baseRefToResRef(base: string, kind: Resources.AllKinds, type: Resources.Type) {
    return `${base}_${kind}_${type}`;
}

function mapStyleToVisuals(style: NtCDescription.MapStyle) {
    switch (style) {
        case 'solid':
            return [ 'solid' ];
        case 'wireframe':
            return [ 'wireframe' ];
        case 'both':
            return [ 'solid', 'wireframe' ];
    }
}

type DownloadedResource = {
    data: string|Uint8Array;
    kind: Resources.AllKinds;
    type: Resources.Type
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
    plugin: PluginUIContext;

    constructor(target: HTMLElement) {
        const defaultSpec = DefaultPluginUISpec();
        const spec: PluginUISpec = {
            ...defaultSpec,
            behaviors: [
                PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
                PluginSpec.Behavior(WatlasLociLabelProvider),
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
    }

    private colorThemeParams(color: Color, theme: ColorTheme.BuiltIn) {
        if (theme === 'element-symbol') {
            return {
                carbonColor: { name: 'custom', params: color }
            };
        }

        return { value: color };
    }

    private densityMapColors(color: Color) {
        return { value: color };
    }

    private densityMapParams(iso: number, style: NtCDescription.MapStyle) {
        const isoValue = Volume.IsoValue.absolute(iso);
        return {
            isoValue,
            alpha: DefaultDensityMapAlpha,
            visuals: mapStyleToVisuals(style),
            quality: 'highest',
            sizeFactor: 2,
        };
    }

    private async remove(cells: any[]) {
        const state = this.plugin.state.data;
        const b = state.build();
        for (const cell of cells)
            b.delete(cell);

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async hide(ref: string) {
        const state = this.plugin.state.data;
        const cell = state.cells.get(ref + '_visual');
        if (cell)
            await this.remove([cell]);
    }

    async loadDensityMap(data: Uint8Array, ref: string) {
        const b = this.plugin.state.data.build().toRoot()
            .apply(RawData, { data }, { ref: ref + '_data' })
            .apply(StateTransforms.Data.ParseCcp4)
            .apply(StateTransforms.Volume.VolumeFromCcp4, {}, { ref: ref + '_volume' } )

        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });
    }

    async loadStructure(data: string, ref: string) {
        const b = this.plugin.state.data.build().toRoot()
            .apply(RawData, { data }, { ref: ref + '_data' })
            .apply(StateTransforms.Model.TrajectoryFromPDB)
            .apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 })
            .apply(StateTransforms.Model.StructureFromModel, {}, { ref: ref + '_structure' })

        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });
    }

    isoRange(ref: string) {
        const cell = this.plugin.state.data.cells.get(ref + '_volume')!;

        // Allow me a question here.
        // How is a person who does not suffer from a personality disorder
        // supposed to figure this out?
        const stats = (cell.obj!.data as Volume).grid.stats;

        return { min: stats.min, max: stats.max };
    }

    async setDensityMapAppearance(iso: number, style: NtCDescription.MapStyle, color: Color, ref: string) {
        const visualRef = ref + '_visual';
        let state = this.plugin.state.data;
        const cell = state.cells.get(visualRef);
        if (!cell)
            return;

        const type = { name: 'isosurface', params: this.densityMapParams(iso, style) };
        const colorTheme = { name: 'uniform', params: this.densityMapColors(color) };
        const b = state.build().to(cell)
            .update(StateTransforms.Representation.VolumeRepresentation3D, old => ({...old, colorTheme, type }));

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async setStructureAppearance(color: Color, theme: ColorTheme.BuiltIn, ref: string) {
        const visualRef = ref + '_visual';
        const state = this.plugin.state.data;
        const cell = state.cells.get(visualRef);
        if (!cell)
            return;

        const type = {
            name: 'ball-and-stick',
            params: {},
        };
        const colorTheme = {
            name: theme,
            params: this.colorThemeParams(color, theme),
        };

        const b = state.build().to(cell)
            .update(StateTransforms.Representation.VolumeRepresentation3D, old => ({...old, colorTheme, type }));

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showDensityMap(base: string, iso: number, style: NtCDescription.MapStyle, color: Color) {
        const ref = base + '_visual';
        const parent = base + '_volume';
        let state = this.plugin.state.data;
        if (state.transforms.has(ref) || !state.transforms.has(parent))
            return;

        const cell = state.cells.get(parent)!;
        const type = { name: 'isosurface', params: this.densityMapParams(iso, style) };
        const colorTheme = { name: 'uniform', params: this.densityMapColors(color) };
        const b = this.plugin.state.data.build().to(cell)
            .apply(StateTransforms.Representation.VolumeRepresentation3D, { colorTheme, type }, { ref });

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showStructure(base: string, color: Color, theme: ColorTheme.BuiltIn) {
        const ref = base + '_visual';
        const parent = base + '_structure';
        const state = this.plugin.state.data;
        if (state.transforms.has(ref) || !state.transforms.has(parent))
            return;

        const cell = state.cells.get(parent)!;
        const type = {
            name: 'ball-and-stick',
            params: {},
        };
        const colorTheme = {
            name: theme,
            params: this.colorThemeParams(color, theme),
        };
        let b = state.build().to(cell)
            .apply(StateTransforms.Representation.StructureRepresentation3D, { colorTheme, type }, { ref });

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
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
    (ntc: NtC, seq: Sequence): void;
}

type FragmentMap = Map<string, NtCDescription.Description>;

interface WatlasAppProps {
    elemId: string;
}

interface WatlasAppState {
    fragments: FragmentMap;
    hue: number;
    showStepWaters: boolean;
}

export class WatlasApp extends React.Component<WatlasAppProps, WatlasAppState> {
    private assignedHues: Map<string, number>;
    private viewer: WatlasViewer | null;
    private loadedFragments: string[];
    private onFragmentAdded: OnFragmentStateChanged | null = null;
    private onFragmentColorsChanged: OnFragmentStateChanged | null = null;
    private onFragmentRemoved: OnFragmentStateChanged | null = null;


    constructor(props: WatlasAppProps) {
        super(props);

        this.state = {
            fragments: new Map(),
            hue: 0,
            showStepWaters: false,
        };

        this.assignedHues = new Map();
        this.loadedFragments = [];
    }

    private densityMapData(base: string, kind: Resources.DensityMaps) {
        const frag = this.state.fragments.get(base)!

        return frag.densityMaps.get(kind)!;
    }

    private async dispose(ntc: NtC, seq: Sequence, disposer: (ref: string) => Promise<void>) {
        if (!this.viewer)
            return;

        const base = mkBaseRef(ntc, seq);
        const frag = this.state.fragments.get(base)!;

        let dkeys = Array.from(frag.densityMaps.keys());
        for (const k of dkeys) {
            const ref = baseRefToResRef(base, k, 'density-map');
            await disposer(ref);
        }

        let skeys = Array.from(frag.structures.keys());
        for (const k of skeys) {
            const ref = baseRefToResRef(base, k, 'structure');
            await disposer(ref);
        };

        const newFragments = new Map(this.state.fragments);
        newFragments.delete(base);

        this.setState(
            {
                ...this.state,
                fragments: newFragments,
            }
        );
    }

    private fragmentColorsInternal(base: string): { colors: Map<Resources.AllKinds, Color>, nextHue: number } {
        let hue;
        let nextHue;

        if (this.assignedHues.has(base)) {
            hue = this.assignedHues.get(base)!;
            nextHue = this.state.hue;
        } else {
            hue = this.state.hue;
            nextHue = Coloring.nextHue(hue);

            this.assignedHues.set(base, hue);
        }

        const colors = new Map<Resources.AllKinds, Color>([
            [ 'reference', Coloring.baseColor(hue) ],
            [ 'base', Coloring.baseColor(hue) ],
            [ 'step', Coloring.stepColor(hue) ],
            [ 'phos', Coloring.phosColor(hue) ]
        ]);

        return { colors, nextHue };
    }

    private isLoaded(ntc: NtC, seq: Sequence) {
        return this.loadedFragments.includes(mkBaseRef(ntc, seq));
    }

    private resetColors() {
        this.assignedHues.clear();

        const newFrags = new Map(this.state.fragments);
        let hue = 0;

        for (const ref of Array.from(newFrags.keys())) {
            const frag = newFrags.get(ref)!;
            frag.colors = new Map<Resources.AllKinds, Color>([
                [ 'reference', Coloring.baseColor(hue) ],
                [ 'base', Coloring.baseColor(hue) ],
                [ 'step', Coloring.stepColor(hue) ],
                [ 'phos', Coloring.phosColor(hue) ],
            ]);

            for (const struRef of Array.from(frag.structures.keys())) {
                const stru = frag.structures.get(struRef)!;
                if (stru.shown) {
                    const theme = struRef === 'reference' ? 'element-symbol' : 'uniform';
                    this.viewer!.setStructureAppearance(frag.colors.get(struRef)!, theme, baseRefToResRef(ref, struRef, 'structure'));
                }
            }

            for (const dmRef of Array.from(frag.densityMaps.keys())) {
                const dm = frag.densityMaps.get(dmRef)!;
                if (dm.shown)
                    this.viewer!.setDensityMapAppearance(dm.iso, dm.style, frag.colors.get(dmRef)!, baseRefToResRef(ref, dmRef, 'density-map'));
            }

            this.assignedHues.set(ref, hue);
            hue = Coloring.nextHue(hue);

            if (this.onFragmentColorsChanged)
                this.onFragmentColorsChanged(frag.ntc, frag.seq);
        }

        this.setState({
            ...this.state,
            hue,
            fragments: newFrags,
        });
    }

    private async showFragmentInitial(frag: NtCDescription.Description) {
        const base = mkBaseRef(frag.ntc, frag.seq);

        for (const [kind, stru] of Array.from(frag.structures.entries())) {
            if (stru.shown) {
                const color = frag.colors.get(kind)!;
                const ref = baseRefToResRef(base, kind, 'structure');
                await this.viewer!.showStructure(ref, color, kind === 'reference' ? 'element-symbol' : 'uniform');
            }
        }
        for (const [kind, dm] of Array.from(frag.densityMaps.entries())) {
            if (dm.shown) {
                const color = frag.colors.get(kind)!;
                const ref = baseRefToResRef(base, kind, 'density-map');
                await this.viewer!.showDensityMap(ref, dm.iso, dm.style, color);
            }
        }
    }

    private updateFragmentDensityMap(data: NtCDescription.DensityMap, base: string, kind: Resources.DensityMaps) {
        const newFragments = new Map(this.state.fragments);
        const frag = newFragments.get(base)!;
        frag.densityMaps.set(kind, data);


        this.setState(
            {
                ...this.state,
                fragments: newFragments,
            }
        );
    }

    private updateFragmentStructure(data: NtCDescription.Structure, base: string, kind: Resources.Structures) {
        const newFragments = new Map(this.state.fragments);
        const frag = newFragments.get(base)!;
        frag.structures.set(kind, data);

        this.setState(
            {
                ...this.state,
                fragments: newFragments,
            }
        );

    }

    componentDidMount() {
        const elem = document.getElementById(this.props.elemId + '-viewer');
        if (!elem)
            throw new Error('No element to render viewer');

        if (!this.viewer)
            this.viewer = new WatlasViewer(elem);

        WatlasViewerApi.bind(this, this.props.elemId);
    }

    async add(ntc: NtC, seq: Sequence, shownStructures: Resources.Structures[], shownDensityMaps: Resources.DensityMaps[]) {
        if (!this.viewer)
            return;

        if (!this.isLoaded(ntc, seq))
            await this.load([ { ntc, seq } ]);

        const ref = mkBaseRef(ntc, seq);

        if (this.state.fragments.has(ref))
            return;

        const baseWaterMapIsoRange = this.viewer.isoRange(baseRefToResRef(ref, 'base', 'density-map'));
        const stepWaterMapIsoRange = this.viewer.isoRange(baseRefToResRef(ref, 'step', 'density-map'));
        const phosWaterMapIsoRange = this.viewer.isoRange(baseRefToResRef(ref, 'phos', 'density-map'));

        const structures: Map<Resources.Structures, NtCDescription.Structure> = new Map([
            [ 'reference', { shown: shownStructures.includes('reference')  } ],
            [ 'base', { shown: shownStructures.includes('base') } ],
            [ 'step', { shown: shownStructures.includes('step') } ],
            [ 'phos', { shown: shownStructures.includes('phos') } ],
        ]);
        const densityMaps: Map<Resources.DensityMaps, NtCDescription.DensityMap> = new Map([
            [ 'base', {
                shown: shownDensityMaps.includes('base'),
                iso: Util.prettyIso(Util.mid(baseWaterMapIsoRange), Util.isoBounds(baseWaterMapIsoRange.min, baseWaterMapIsoRange.max).step),
                isoRange: baseWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
            [ 'step', {
                shown: shownDensityMaps.includes('step'),
                iso: Util.prettyIso(Util.mid(stepWaterMapIsoRange), Util.isoBounds(stepWaterMapIsoRange.min, stepWaterMapIsoRange.max).step),
                isoRange: stepWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
            [ 'phos', {
                shown: shownDensityMaps.includes('phos'),
                iso: Util.prettyIso(Util.mid(phosWaterMapIsoRange), Util.isoBounds(phosWaterMapIsoRange.min, phosWaterMapIsoRange.max).step),
                isoRange: phosWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
        ]);
        const { colors, nextHue } = this.fragmentColorsInternal(ref);

        const frag: NtCDescription.Description = {
            ntc,
            seq,
            structures,
            densityMaps,
            colors
        };
        const newFragments: FragmentMap = new Map([[ref, frag]]);

        await this.showFragmentInitial(frag);

        this.setState(
            {
                ...this.state,
                fragments: new Map(
                    [
                        ...Array.from(this.state.fragments.entries()),
                        ...Array.from(newFragments.entries())
                    ]
                ),
                hue: nextHue,
            }
        );
        if (this.onFragmentAdded)
            this.onFragmentAdded(ntc, seq);
    }

    forceRerender() {
        this.forceUpdate();
    }

    fragmentColors(ntc: NtC, seq: Sequence, format: 'style' | 'rgb'): ColorInfo | undefined {
        const ref = mkBaseRef(ntc, seq);
        if (!this.assignedHues.has(ref))
            return undefined;

        const { colors } = this.fragmentColorsInternal(ref);
        switch (format) {
            case 'style':
                return {
                    base: Color.toStyle(colors.get('base')!),
                    phos: Color.toStyle(colors.get('phos')!),
                    step: Color.toStyle(colors.get('step')!),
                };
            case 'rgb':
                return {
                    base: Color.toRgb(colors.get('base')!),
                    phos: Color.toRgb(colors.get('phos')!),
                    step: Color.toRgb(colors.get('step')!),
                };
        }
    }

    has(ntc: NtC, seq: Sequence) {
        return this.state.fragments.has(mkBaseRef(ntc, seq));
    }

    async load(fragments: { ntc: NtC, seq: Sequence }[], callback?: OnFragmentLoaded) {
        if (!this.viewer)
            return;

        const pending: { ntc: NtC, seq: Sequence, prom: Promise<DownloadedResource[]>}[] = [];

        for (const frag of fragments) {
            if (this.isLoaded(frag.ntc, frag.seq))
                continue;
            const links = Resources.makeLinks(frag.ntc, frag.seq);
            pending.push({ ntc: frag.ntc, seq: frag.seq, prom: download(links) });
        }

        let errors: string[] = [];
        let ctr = 0;
        for (const p of pending) {
            try {
                const resources = await p.prom;

                for (const r of resources) {
                    if (r.type === 'density-map')
                        await this.viewer!.loadDensityMap(r.data as Uint8Array, mkResRef(p.ntc, p.seq, r.kind, 'density-map'));
                    else
                        await this.viewer!.loadStructure(r.data as string, mkResRef(p.ntc, p.seq, r.kind, 'structure'));
                }

                this.loadedFragments.push(mkBaseRef(p.ntc, p.seq));
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

    async remove(ntc: NtC, seq: Sequence) {
        await this.dispose(ntc, seq, ref => this.viewer!.hide(ref));
        if (this.onFragmentRemoved)
            this.onFragmentRemoved(ntc, seq);
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

    async unload(ntc: NtC, seq: Sequence) {
        await this.dispose(ntc, seq, ref => this.viewer!.unload(ref));

        const base = mkBaseRef(ntc, seq);
        this.loadedFragments = this.loadedFragments.filter(v => v !== base);

        if (this.onFragmentRemoved)
            this.onFragmentRemoved(ntc, seq);
    }

    render() {
        return (
            <div className='wva-app-container'>
                <div id={this.props.elemId + '-viewer'} className='wva-viewer'></div>
                <div className='wva-ctrl-panel'>
                    <List
                        fragments={this.state.fragments}
                        showStepWaters={this.state.showStepWaters}
                        onDensityMapIsoChanged={(iso, kind, base) => {
                            const ref = baseRefToResRef(base, kind, 'density-map');
                            const { colors } = this.fragmentColorsInternal(base);
                            const dm = this.densityMapData(base, kind);

                            this.viewer!.setDensityMapAppearance(iso, dm.style, colors.get(kind)!, ref);

                            this.updateFragmentDensityMap({ ...dm, iso }, base, kind);
                        }}
                        onDensityMapStyleChanged={(style, kind, base) => {
                            const ref = baseRefToResRef(base, kind, 'density-map');
                            const { colors } = this.fragmentColorsInternal(base);
                            const dm = this.densityMapData(base, kind);

                            this.viewer!.setDensityMapAppearance(dm.iso, style, colors.get(kind)!, ref);

                            this.updateFragmentDensityMap({ ...dm, style }, base, kind);
                        }}
                        onHideShowResource={(show, kind, type, base) => {
                            const frag = this.state.fragments.get(base)!;
                            const ref = baseRefToResRef(base, kind, type);

                            if (type === 'density-map') {
                                const dm = frag.densityMaps.get(kind as Resources.DensityMaps)!;
                                if (show) {
                                    const color = frag.colors.get(kind)!;
                                    this.viewer!.showDensityMap(ref, dm.iso, dm.style, color);
                                } else
                                    this.viewer!.hide(ref);

                                this.updateFragmentDensityMap({ ...dm, shown: show }, base, kind as Resources.DensityMaps);
                            } else {
                                const stru = frag.structures.get(kind)!;
                                if (show) {
                                    const color = frag.colors.get(kind)!;
                                    this.viewer!.showStructure(ref, color, kind === 'reference' ? 'element-symbol' : 'uniform');
                                } else
                                    this.viewer!.hide(ref);

                                this.updateFragmentStructure({ ...stru, shown: show }, base, kind);
                            }
                        }}
                        onRemoveClicked={base => {
                            const frag = this.state.fragments.get(base)!
                            this.remove(frag.ntc, frag.seq);
                        }}
                    />
                    <Controls
                        showStepWaters={this.state.showStepWaters}
                        onHideShowStepWaters={show => {
                            if (!show) {
                                for (const [base, frag] of Array.from(this.state.fragments.entries())) {
                                    const stru = frag.structures.get('step')!;
                                    if (stru.shown)
                                        this.viewer!.hide(baseRefToResRef(base, 'step', 'structure'));

                                    const dm = frag.densityMaps.get('step')!;
                                    if (dm.shown)
                                        this.viewer!.hide(baseRefToResRef(base, 'step', 'density-map'));
                                }
                            } else {
                                for (const [base, frag] of Array.from(this.state.fragments.entries())) {
                                    const color = frag.colors.get('step')!;
                                    const stru = frag.structures.get('step')!;
                                    if (stru.shown)
                                        this.viewer!.showStructure(baseRefToResRef(base, 'step', 'structure'), color, 'uniform');

                                    const dm = frag.densityMaps.get('step')!;
                                    if (dm.shown)
                                        this.viewer!.showDensityMap(baseRefToResRef(base, 'step', 'density-map'), dm.iso, dm.style, color);
                                }
                            }

                            this.setState({ ...this.state, showStepWaters: show });
                        }}
                        onResetColors={() => this.resetColors()}
                    />
                </div>
            </div>
        );
    }
}

export namespace WatlasApp {
    export function init(elemId: string) {
        const elem = document.getElementById(elemId);
        if (!elem)
            throw new Error(`Element ${elemId} does not exist`);

        ReactDOM.render(<WatlasApp elemId={elemId} />, elem);
    }
}
