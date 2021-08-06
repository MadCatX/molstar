import './index.html';
import { WebMmbViewerPluginSpec } from './spec';
import { createPlugin } from '../../mol-plugin-ui';
import { Asset } from '../../mol-util/assets';
import { Color } from '../../mol-util/color';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { UpdateTrajectory } from '../../mol-plugin-state/actions/structure';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { Download, RawData } from '../../mol-plugin-state/transforms/data';
import { createStructureRepresentationParams } from '../../mol-plugin-state/helpers/structure-representation-params';

export type DensityMapFormat = 'ccp4';
export type StructureFileFormat = 'mmcif' | 'pdb';
export type Representation = 'cartoon' | 'ball-and-stick';

class WebMmbViewer {
    private WebMmbPluginSpecImpl = WebMmbViewerPluginSpec;
    private plugin: PluginContext;
    private isInited = false;
    private represenation: Representation = 'ball-and-stick';
    private _locked = false;

    private getNumberOfModels() {
        const state = this.plugin.state.data;
        const models = state.selectQ(q => q.ofTransformer(StateTransforms.Model.ModelFromTrajectory));

        for (const m of models) {
            if (!m.sourceRef)
                continue;

            const parent = state.cells.get(m.sourceRef)!.obj as PSO.Molecule.Trajectory;
            if (!parent)
                continue;

            return parent.data.frameCount;
        }

        return 0;
    }

    private getVisualParams() {
        switch (this.represenation) {
            case 'cartoon':
                let params = createStructureRepresentationParams(this.plugin, void 0, { type: 'cartoon' });
                params.type.params.visuals = ['polymer-trace', 'nucleotide-ring'];
                return params;
            case 'ball-and-stick':
                return createStructureRepresentationParams(this.plugin, void 0, { type: 'ball-and-stick' });
        }
    }

    async clear() {
        await this.clearDensityMap();
        await this.clearStructure();
    }

    async clearDensityMap() {
        const state = this.plugin.state.data;
        if (!state.cells.has('dm_data'))
            return;
        await PluginCommands.State.RemoveObject(this.plugin, { state, ref: 'dm_data' });
    }

    async clearStructure() {
        const state = this.plugin.state.data;
        if (!state.cells.has('structure_data'))
            return;
        await PluginCommands.State.RemoveObject(this.plugin, { state, ref: 'structure_data' });
    }

    init(target: HTMLElement) {
        if (this.isInited === true)
            return;

        this.plugin = createPlugin(
            target,
            {
                ...this.WebMmbPluginSpecImpl,
                layout: {
                    initial: {
                        isExpanded: false,
                        showControls: false
                    }
                }
            });
    }

    async loadDensityMap(url: string, format: DensityMapFormat) {
        if (this._locked === true)
            return;

        this._locked = true;

        try {
            const clr = this.clearDensityMap();

            const resp = await fetch(url);
            if (!resp.ok)
                throw new Error(`Cannot download density map: ${resp.status} ${resp.statusText}`);

            const blob = await resp.blob();
            const data = new Uint8Array(await blob.arrayBuffer());

            await clr;

            let b = this.plugin.state.data.build().toRoot();
            b = b.apply(RawData, { data }, { ref: 'dm_data' })
                 .apply(StateTransforms.Data.ParseCcp4)
                 .apply(StateTransforms.Volume.VolumeFromCcp4, {}, { ref: 'dm_volume' })
                 .apply(
                     StateTransforms.Representation.VolumeRepresentation3D,
                     {
                         type: {
                             name: 'isosurface',
                             params: {
                                 alpha: 0.25,
                                 visuals: 'solid'
                             }
                         },
                         colorTheme: {
                             name: 'uniform',
                             params: { color: Color(0xAAAAAA) },
                         }
                     },
                     { ref: 'dm_visual' }
                 );

            await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });
        } catch (e) {
            console.warn(e);
            throw e;
        } finally {
            this._locked = false;
        }
    }

    async loadDensityMapIfNeeded(url: string, format: DensityMapFormat) {
        if (this._locked)
            return;

        const state = this.plugin.state.data;
        if (state.cells.has('dm_visual'))
            return;
        else
            this.loadDensityMap(url, format);
    }

    async loadStructure(url: string, format: StructureFileFormat) {
        if (this._locked)
            return;

        this._locked = true;
        try {
            await this.clearStructure();

            let b = this.plugin.state.data.build().toRoot();
            b = b.apply(Download, { url: Asset.Url(url) }, { ref: 'structure_data' });
            b = format === 'pdb' ?
                b.apply(StateTransforms.Model.TrajectoryFromPDB) :
                b.apply(StateTransforms.Data.ParseCif).apply(StateTransforms.Model.TrajectoryFromMmCif);
            b = b.apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 }, { ref: 'structure_trajectory' });
            b = b.apply(StateTransforms.Model.StructureFromModel, { type: { name: 'assembly', params: { id: 'deposited' } } }, { ref: 'structure_structure' });
            b = b.apply(StateTransforms.Representation.StructureRepresentation3D, this.getVisualParams(), { ref: 'structure_visual' });

            await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });

            const numModels = this.getNumberOfModels();
            await PluginCommands.State.ApplyAction(this.plugin, {
                state: this.plugin.state.data,
                action: UpdateTrajectory.create({ action: 'advance', by: numModels - 1 })
            });
        } catch (e) {
            console.warn(e);
        }
        this._locked = false;
    }

    async setRepresentation(repr: Representation) {
        let state = this.plugin.state.data;
        const cell = state.cells.get('structure_visual');
        if (!cell)
            return;

        if (this._locked === true)
            return;

        this._locked = true;
        try {
            this.represenation = repr;

            const b = state.build().to(cell)
                .update(StateTransforms.Representation.StructureRepresentation3D, old => ({...old, repr }));

            await PluginCommands.State.Update(this.plugin, { state, tree: b });
        } catch (e) {
            console.warn(e);
        }
        this._locked = false;
    }
}

(window as any).WebMmbViewer = new WebMmbViewer();