import { BasePairs } from '../property';
import { BasePairsLadderColorThemeProvider } from './color';
import { BasePairsLadderProvider } from './property';
import { BasePairsLadderRepresentationProvider } from './representation';
import { StructureRepresentationPresetProvider, PresetStructureRepresentations } from '../../../mol-plugin-state/builder/structure/representation-preset';
import { StateObjectRef } from '../../../mol-state';
import { Task } from '../../../mol-task';
import { BasePairsTypes } from '../types';

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

const EdgeAbbrev = {
    'hoogsteen': 'H',
    'sugar': 'S',
    'watson-crick': 'W',
} as const;
function westhofAbbrev(pair: BasePairsTypes.BasePair) {
    const ct = pair.orientation === 'cis' ? 'c' : 't';
    const edges = [EdgeAbbrev[pair.a.base_edge], EdgeAbbrev[pair.b.base_edge]];
    if (edges[0].charCodeAt(0) > edges[1].charCodeAt(1)) edges.reverse();

    return `${ct}${edges.join('')}`;
}

function formatBase(base: BasePairsTypes.BaseInPair) {
    return `<b>${base.comp_id} ${base.seq_id}${base.PDB_ins_code}${base.alt_id.length > 0 ? ` (alt ${base.alt_id})` : ''}`
}

const RemoveNewline = /\r?\n/g;
export function basePairLabel(pair: BasePairsTypes.BasePair) {
    return `
        <b>${westhofAbbrev(pair)}</b><br />
        <b>${formatBase(pair.a)} ${formatBase(pair.b)}</b>
    `.replace(RemoveNewline, '');
}
