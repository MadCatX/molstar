import './index.html';
import { WebMmbViewerPluginSpec } from './spec';
import { createPlugin } from '../../mol-plugin';
import { Asset } from '../../mol-util/assets';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { UpdateTrajectory } from '../../mol-plugin-state/actions/structure';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { Download } from '../../mol-plugin-state/transforms/data';
import { createStructureRepresentationParams } from '../../mol-plugin-state/helpers/structure-representation-params';

export type FileFormat = 'mmcif' | 'pdb';
export type Representation = 'cartoon' | 'ball-and-stick';

class WebMmbViewer {
    private WebMmbPluginSpecImpl = WebMmbViewerPluginSpec;
    private plugin: PluginContext;
    private isInited = false;
    private represenation: Representation = 'ball-and-stick';
    private _locked = false;

    private async clear() {
        /* Get the current dataState of the plugin */
        const state = this.plugin.state.data;

        /* Remove the current object from the state */
        await PluginCommands.State.RemoveObject(this.plugin, { state, ref: state.tree.root.ref });

        /* Make a new empty tree */
        const tree = state.build();

        /* Set the new empty tree */
        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree });
    }

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

    private async removeIfPresent(refs: string[]) {
        const state = this.plugin.state.data;
        let b = state.build();
        for (let ref of refs) {
            if (state.transforms.has(ref)) {
                b.delete(ref);
            }
        }

        await PluginCommands.State.Update(this.plugin, { state, tree: b });
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

    async load(url: string, format: FileFormat) {
        if (this._locked === true)
            return;

        this._locked = true;
        try {
            await this.clear();

            let b = this.plugin.state.data.build().toRoot();
            b = b.apply(Download, { url: Asset.Url(url) }, { ref: 'data' });
            b = format === 'pdb' ?
                b.apply(StateTransforms.Model.TrajectoryFromPDB) :
                b.apply(StateTransforms.Data.ParseCif).apply(StateTransforms.Model.TrajectoryFromMmCif);
            b = b.apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 }, { ref: 'trajectory' });
            b = b.apply(StateTransforms.Model.StructureFromModel, { type: { name: 'assembly', params: { id: 'deposited' } } }, { ref: 'structure' });
            b = b.apply(StateTransforms.Representation.StructureRepresentation3D, this.getVisualParams(), { ref: 'visual' });

            await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });

            const numModels = this.getNumberOfModels();
            await PluginCommands.State.ApplyAction(this.plugin, {
                state: this.plugin.state.data,
                action: UpdateTrajectory.create({ action: 'advance', by: numModels - 1 })
            });
        } catch (e) {
        }
        this._locked = false;
    }

    async setRepresentation(repr: Representation) {
        if (this._locked === true)
            return;

        this._locked = true;
        try {
            this.represenation = repr;
            this.removeIfPresent(['visual']);

            let b = this.plugin.state.data.build().to('structure');
            b = b.apply(StateTransforms.Representation.StructureRepresentation3D, this.getVisualParams(), { ref: 'visual' });

            await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });
        } catch (e) {
        }
        this._locked = false;
    }
}

(window as any).WebMmbViewer = new WebMmbViewer();