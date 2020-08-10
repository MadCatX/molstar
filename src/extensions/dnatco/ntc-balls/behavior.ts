/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 */

import { NtcBallsColorThemeProvider } from './color';
import { NtcBallsProvider } from './property';
import { NtcBallsRepresentationProvider } from './representation';
import { DnatcoCommon as DC } from '../common';
import { Loci } from '../../../mol-model/loci';
import { PluginBehavior } from '../../../mol-plugin/behavior/behavior';
import { StructureRepresentationPresetProvider, presetSelectionComponent } from '../../../mol-plugin-state/builder/structure/representation-preset';
import { StateObjectRef } from '../../../mol-state';
import { Task } from '../../../mol-task';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';

const updateFocusRepr = StructureRepresentationPresetProvider.updateFocusRepr;

export const DnatcoNtcBallsPreset = StructureRepresentationPresetProvider({
    id: 'preset-structure-representation-ntc-balls',
    display: {
        name: 'NtC Balls', group: 'Non-standard',
        description: 'Non-standard representation of nulecic acids including NtC',
    },
    isApplicable(a) {
        return a.data.models.length >= 1 && a.data.models.some(m => DC.isApplicable(m));
    },
    params: () => StructureRepresentationPresetProvider.CommonParams,
    async apply(ref, params, plugin) {
        const structureCell = StateObjectRef.resolveAndCheck(plugin.state.data, ref);
        const model = structureCell?.obj?.data.model;
        if (!structureCell || !model) return {};

        await plugin.runTask(Task.create('NtC Balls', async runtime => {
            await NtcBallsProvider.attach({ runtime, assetManager: plugin.managers.asset }, model);
        }));

        const components = {
            nucleic: await presetSelectionComponent(plugin, structureCell, 'nucleic'),
            balls: await presetSelectionComponent(plugin, structureCell, 'nucleic')
        }

        const { update, builder, typeParams, color } = StructureRepresentationPresetProvider.reprBuilder(plugin, params);

        const representations = {
            nucleic: builder.buildRepresentation(update, components.nucleic, { type: 'cartoon', typeParams, color }, { tag: 'nucleic' }),
            balls: builder.buildRepresentation(update, components.nucleic, { type: NtcBallsRepresentationProvider, typeParams, color: NtcBallsColorThemeProvider }, { tag: 'ntc-balls' })
        }

        await update.commit({ revertOnError: true });
        await updateFocusRepr(plugin, structureCell.obj!.data, params.theme?.focus?.name, params.theme?.focus?.params);

        return  { components, representations };
    }
});

export const DnatcoNtcBalls = PluginBehavior.create<{ autoAttach: boolean, showToolTip: boolean }>({
    name: 'dnatco-ntc-balls-prop',
    category: 'custom-props',
    display: {
        name: 'NtC Balls',
        description: 'Non-standard representation of nulecic acids including NtC',
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showToolTip: boolean }> {

        private provider = NtcBallsProvider;

        private labelNtcBalls = {
            label: (loci: Loci): string | undefined => {
                if (!this.params.showToolTip) return void 0;

                /* TODO: Implement this */
                return void 0;
            }
        }

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.managers.lociLabels.addProvider(this.labelNtcBalls);

            this.ctx.representation.structure.themes.colorThemeRegistry.add(NtcBallsColorThemeProvider);
            this.ctx.representation.structure.registry.add(NtcBallsRepresentationProvider);

            this.ctx.builders.structure.representation.registerPreset(DnatcoNtcBallsPreset);
        }

        update(p: { autoAttach: boolean, showToolTip: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            this.params.showToolTip = p.showToolTip;
            this.ctx.customModelProperties.setDefaultAutoAttach(this.provider.descriptor.name, this.params.autoAttach);
            return updated;
        }

        unregister() {
            this.ctx.customModelProperties.unregister(NtcBallsProvider.descriptor.name);
            this.ctx.managers.lociLabels.removeProvider(this.labelNtcBalls);

            this.ctx.representation.structure.registry.remove(NtcBallsRepresentationProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(NtcBallsColorThemeProvider);

            this.ctx.builders.structure.representation.unregisterPreset(DnatcoNtcBallsPreset);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(true),
        showToolTip: PD.Boolean(true)
    })
});
