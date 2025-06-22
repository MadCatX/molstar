import { BasePairs } from '../property';
import { BasePairsLadderColorThemeProvider } from './color';
import { BasePairsLadderProvider } from './property';
import { BasePairsLadderRepresentationProvider } from './representation';
import { StructureRepresentationPresetProvider, PresetStructureRepresentations } from '../../../mol-plugin-state/builder/structure/representation-preset';
import { StateObjectRef } from '../../../mol-state';
import { Task } from '../../../mol-task';

export const BasePairsLadderPreset = StructureRepresentationPresetProvider({
    id: 'preset-structure-representation-base-pairs-ladder',
    display: {
        name: 'Base Pairs Ladder', group: 'Annotation',
        description: 'Simple depiction of base pairs geometry',
    },
    isApplicable(a) {
        return a.data.models.length >= 1 && a.data.models.some(m => BasePairs.isApplicable(m));
    },
    params: () => StructureRepresentationPresetProvider.CommonParams,
    async apply(ref, params, plugin) {
        const structureCell = StateObjectRef.resolveAndCheck(plugin.state.data, ref);
        const model = structureCell?.obj?.data.model;
        if (!structureCell || !model) return {};

        await plugin.runTask(Task.create('Base Pairs Ladder', async runtime => {
            await BasePairsLadderProvider.attach({ runtime, assetManager: plugin.managers.asset, errorContext: plugin.errorContext }, model);
        }));


        const { components, representations } = await PresetStructureRepresentations.auto.apply(ref, { ...params }, plugin);

        const ladder = await plugin.builders.structure.tryCreateComponentStatic(structureCell, 'nucleic', { label: 'Base Pairs Ladder' });
        const { update, builder, typeParams } = StructureRepresentationPresetProvider.reprBuilder(plugin, params);

        let ladderRepr;
        if (representations)
            ladderRepr = builder.buildRepresentation(update, ladder, { type: BasePairsLadderRepresentationProvider, typeParams, color: BasePairsLadderColorThemeProvider }, { tag: 'base-pairs-ladder' });

        await update.commit({ revertOnError: true });
        return { components: { ...components, ladder }, representations: { ...representations, ladderRepr } };
    }
});
