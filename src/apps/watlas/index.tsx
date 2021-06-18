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
import { List } from './list';
import { NtCDescription, Range } from './ntc-description';
import { NtC, Sequence, Resources } from './resources';
import { Volume } from '../../mol-model/volume';
import { PluginBehaviors } from '../../mol-plugin/behavior';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginSpec } from '../../mol-plugin/spec';
import { createPlugin } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { RawData } from '../../mol-plugin-state/transforms/data';
import { Color } from '../../mol-util/color';
import { ColorTheme } from '../../mol-theme/color';

const DefaultDensityMapAlpha = 0.5;
const DefaultDensityMapStyle = 'solid';

export const WatlasViewerApi = new Api();
(window as any).WVApi = WatlasViewerApi;

function mid(range: Range<number>) {
    return (range.max - range.min) / 2 + range.min;
}

function mkBaseRef(ntc: NtC, seq: Sequence) {
    return `${ntc}_${seq}`;
}

function mkResRef(ntc: NtC, seq: Sequence, kind: Resources.AllKinds, type: Resources.Type) {
    return baseRefToResRef(mkBaseRef(ntc, seq), kind, type);
}

function baseRefToResRef(base: string, kind: Resources.AllKinds, type: Resources.Type) {
    return `${base}_${kind}_${type}`;
}

function hsv2rgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
  const f = (n: number, k = (n + h / 60 ) % 6) => v - v * s * Math.max( Math.min(k, 4 - k, 1), 0);
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

function hsvToColor(h: number, s: number, v: number) {
    const { r, g, b } = hsv2rgb(h, s, v)
    return Color.fromRgb(r, g, b);
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

class WatlasViewer {
    plugin: PluginUIContext;

    constructor(target: HTMLElement) {
        const defaultSpec = DefaultPluginUISpec();
        const spec: PluginUISpec = {
            ...defaultSpec,
            behaviors: [
                PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
                PluginSpec.Behavior(PluginBehaviors.Representation.DefaultLociLabelProvider),
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

    async setDensityMapAppearance(iso: number, style: NtCDescription.MapStyle, ref: string) {
        const visualRef = ref + '_visual';
        let state = this.plugin.state.data;
        const cell = state.cells.get(visualRef);
        if (!cell)
            return;

        const isoValue = Volume.IsoValue.absolute(iso);
        const type = { name: 'isosurface', params: { isoValue, alpha: DefaultDensityMapAlpha, visuals: mapStyleToVisuals(style) } };
        const b = state.build().to(cell)
            .update(StateTransforms.Representation.VolumeRepresentation3D, old => ({...old, type }));

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showDensityMap(ref: string, iso: number, style: NtCDescription.MapStyle, color: Color) {
        const parent = ref + '_volume';
        let state = this.plugin.state.data;
        if (!state.transforms.has(parent))
            return;

        const cell = state.cells.get(parent)!;
        const isoValue = Volume.IsoValue.absolute(iso);
        const type = { name: 'isosurface', params: { isoValue, alpha: DefaultDensityMapAlpha, visuals: mapStyleToVisuals(style) } };
        const colorTheme = { name: 'uniform', params: { value: color } };
        const b = this.plugin.state.data.build().to(cell)
            .apply(StateTransforms.Representation.VolumeRepresentation3D, { colorTheme, type }, { ref: ref + '_visual' });

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
    }

    async showStructure(ref: string, color: Color, theme: ColorTheme.BuiltIn) {
        const parent = ref + '_structure';
        const state = this.plugin.state.data;
        if (!state.transforms.has(parent))
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
            .apply(StateTransforms.Representation.StructureRepresentation3D, { colorTheme, type }, { ref: ref + '_visual' });

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

type FragmentMap = Map<string, NtCDescription.Description>;

interface WatlasAppState {
    fragments: FragmentMap;
    hue: number;
}

export class WatlasApp extends React.Component<{}, WatlasAppState> {
    private viewer: WatlasViewer | null;
    private loadedFragments: string[];

    constructor(props: {}) {
        super(props);

        this.state = {
            fragments: new Map(),
            hue: 0,
        };

        this.loadedFragments = [];
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

    private isLoaded(ntc: NtC, seq: Sequence) {
        return this.loadedFragments.includes(mkBaseRef(ntc, seq));
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
        const elem = document.getElementById('watlas-viewer');
        if (!elem)
            throw new Error('No element to render viewer');

        if (!this.viewer)
            this.viewer = new WatlasViewer(elem);

        WatlasViewerApi.bind(this);
    }

    async add(ntc: NtC, seq: Sequence, shownStructures: Resources.Structures[], shownDensityMaps: Resources.DensityMaps[]) {
        if (!this.viewer)
            return;

        if (!this.isLoaded(ntc, seq))
            await this.load([ { ntc, seq } ]);

        const ref = mkBaseRef(ntc, seq);

        if (this.state.fragments.has(ref))
            return;

        const hue = this.state.hue;
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
                iso: mid(baseWaterMapIsoRange),
                isoRange: baseWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
            [ 'step', {
                shown: shownDensityMaps.includes('step'),
                iso: mid(stepWaterMapIsoRange),
                isoRange: stepWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
            [ 'phos', {
                shown: shownDensityMaps.includes('phos'),
                iso: mid(phosWaterMapIsoRange),
                isoRange: phosWaterMapIsoRange,
                style: DefaultDensityMapStyle,
            }],
        ]);
        const colors: Map<Resources.AllKinds, Color> = new Map([
            [ 'reference', hsvToColor(hue, 1, 1) ],
            [ 'base', hsvToColor(hue, 1, 1) ],
            [ 'step', hsvToColor((hue + 40) % 360, 0.8, 0.5) ],
            [ 'phos', hsvToColor((hue + 80) % 360, 0.6, 1) ]
        ]);

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
                hue: (hue + 95) % 360,
            }
        );
    }

    has(ntc: NtC, seq: Sequence) {
        return this.state.fragments.has(mkBaseRef(ntc, seq));
    }

    async load(fragments: { ntc: NtC, seq: Sequence }[]) {
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
            }
        }

        if (errors.length > 0)
            throw errors;
    }

    async remove(ntc: NtC, seq: Sequence) {
        await this.dispose(ntc, seq, ref => this.viewer!.hide(ref));
    }

    async unload(ntc: NtC, seq: Sequence) {
        await this.dispose(ntc, seq, ref => this.viewer!.unload(ref));

        const base = mkBaseRef(ntc, seq);
        this.loadedFragments = this.loadedFragments.filter(v => v !== base);
    }

    render() {
        return (
            <div id='watlas-app-container'>
                <div id='watlas-viewer'></div>
                <List
                    fragments={this.state.fragments}
                    onDensityMapIsoChanged={(iso, kind, base) => {
                        const frag = this.state.fragments.get(base)!
                        const ref = baseRefToResRef(base, kind, 'density-map');

                        const dm = frag.densityMaps.get(kind)!;

                        this.viewer!.setDensityMapAppearance(iso, dm.style, ref);

                        this.updateFragmentDensityMap({ ...dm, iso }, base, kind);
                    }}
                    onDensityMapStyleChanged={(style, kind, base) => {
                        const frag = this.state.fragments.get(base)!
                        const ref = baseRefToResRef(base, kind, 'density-map');

                        const dm = frag.densityMaps.get(kind)!;

                        this.viewer!.setDensityMapAppearance(dm.iso, style, ref);

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
                />
            </div>
        );
    }
}

ReactDOM.render(<WatlasApp />, document.getElementById('watlas-app'));
