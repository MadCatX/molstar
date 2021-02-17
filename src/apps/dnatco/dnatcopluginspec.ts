/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { DnatcoNaming } from './dnatco-naming';
import { StepSlider } from './stepslider';
import { Util } from './util';
import { PluginSpec } from '../../mol-plugin/spec';
import { StateActions } from '../../mol-plugin-state/actions';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { InitVolumeStreaming, BoxifyVolumeStreaming, CreateVolumeStreamingBehavior } from '../../mol-plugin/behavior/dynamic/volume-streaming/transformers';
import { VolumeStreamingCustomControls } from '../../mol-plugin-ui/custom/volume';
import { PluginBehavior, PluginBehaviors } from '../../mol-plugin/behavior';
import { Binding } from '../../mol-util/binding';
import { ParamDefinition as PD } from '../../mol-util/param-definition';
import { ButtonsType, ModifiersKeys } from '../../mol-util/input/input-observer';
import { Loci } from '../../mol-model/loci';
import { PluginContext } from '../../mol-plugin/context';
import { StructureElement } from '../../mol-model/structure';
import { arrayMax } from '../../mol-util/array';
import { Representation } from '../../mol-repr/representation';

const B = ButtonsType;
const M = ModifiersKeys;
const DnatcoSelectLociBindings = {
    clickSelect: Binding.Empty,
    clickToggleExtend: Binding.Empty,
    clickSelectOnly: Binding([Binding.Trigger(B.Flag.Primary, M.create())], 'Set selection to clicked element using ${triggers}.'),
    clickToggle: Binding.Empty,
    clickDeselect: Binding.Empty,
    clickDeselectAllOnEmpty: Binding([Binding.Trigger(B.Flag.Primary)], 'Deselect all when clicking on nothing using ${triggers}.'),
};
const SelectLociParams = {
    bindings: PD.Value(DnatcoSelectLociBindings, { isHidden: true }),
};
type SelectLociProps = PD.Values<typeof SelectLociParams>;

const DnatcoSelectLociBehaviors = PluginBehavior.create({
    name: 'dnatco-representation-select-loci',
    category: 'interaction',
    ctor: class extends PluginBehavior.Handler<SelectLociProps> {
        private dnatcoInteractionProvider = (interactionLoci: Representation.Loci) => {
            if (interactionLoci.loci.kind !== 'element-loci') {
                return;
            }

            let lociFirst: StructureElement.Loci = Loci.normalize(interactionLoci.loci) as StructureElement.Loci;
            let lociSecond = StepSlider.forward(lociFirst);

            const locationFirst = Util.lociToLocation(lociFirst);
            const locationSecond = lociSecond ? Util.lociToLocation(lociSecond) : undefined;

            if (!locationSecond) {
                return;
            }

            const idFirst = DnatcoNaming.makeResidueId(locationFirst);
            const idSecond = locationSecond ? DnatcoNaming.makeResidueId(locationSecond) : '';

            const stepId = DnatcoNaming.makeStepId(locationFirst, idFirst, idSecond, this.ctx);

            let spec: DnatcoPluginSpec = this.ctx.spec;
            if (spec.lociSelectedCallback) {
                spec.lociSelectedCallback(stepId);
            }
        }

        register() {
            const lociIsEmpty = (current: Representation.Loci) => Loci.isEmpty(current.loci);
            const lociIsNotEmpty = (current: Representation.Loci) => !Loci.isEmpty(current.loci);

            const actions: [keyof typeof DnatcoSelectLociBindings, (current: Representation.Loci) => void, ((current: Representation.Loci) => boolean) | undefined][] = [
                ['clickSelectOnly', current => this.dnatcoInteractionProvider(current), lociIsNotEmpty],
                ['clickDeselectAllOnEmpty', () => this.ctx.managers.interactivity.lociSelects.deselectAll(), lociIsEmpty],
            ];

            // sort the action so that the ones with more modifiers trigger sooner.
            actions.sort((a, b) => {
                const x = this.params.bindings[a[0]], y = this.params.bindings[b[0]];
                const k = x.triggers.length === 0 ? 0 : arrayMax(x.triggers.map(t => M.size(t.modifiers)));
                const l = y.triggers.length === 0 ? 0 : arrayMax(y.triggers.map(t => M.size(t.modifiers)));
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
        }
        unregister() {
        }
        constructor(ctx: PluginContext, params: SelectLociProps) {
            super(ctx, params);
        }
    },
    params: () => SelectLociParams,
    display: { name: 'Select Loci on Canvas' }
});

interface DnatcoPluginSpec extends PluginSpec {
    lociSelectedCallback?: (_: string) => void,
}

export const DnatcoPluginSpec: DnatcoPluginSpec = {
    actions: [
        PluginSpec.Action(StateActions.Structure.DownloadStructure),
        PluginSpec.Action(StateActions.Volume.DownloadDensity),
        PluginSpec.Action(StateActions.DataFormat.OpenFiles),
        PluginSpec.Action(StateActions.Structure.EnableModelCustomProps),
        PluginSpec.Action(StateActions.Structure.EnableStructureCustomProps),

        // Volume streaming
        PluginSpec.Action(InitVolumeStreaming),
        PluginSpec.Action(BoxifyVolumeStreaming),
        PluginSpec.Action(CreateVolumeStreamingBehavior),

        PluginSpec.Action(StateTransforms.Data.Download),
        PluginSpec.Action(StateTransforms.Data.ParseCif),
        PluginSpec.Action(StateTransforms.Data.ParseCcp4),
        PluginSpec.Action(StateTransforms.Data.ParseDsn6),

        PluginSpec.Action(StateTransforms.Model.TrajectoryFromMmCif),
        PluginSpec.Action(StateTransforms.Model.TrajectoryFromPDB),
        PluginSpec.Action(StateTransforms.Model.TransformStructureConformation),
        PluginSpec.Action(StateTransforms.Model.StructureFromModel),
        PluginSpec.Action(StateTransforms.Model.StructureFromTrajectory),
        PluginSpec.Action(StateTransforms.Model.ModelFromTrajectory),
        PluginSpec.Action(StateTransforms.Model.StructureSelectionFromScript),
        PluginSpec.Action(StateTransforms.Representation.StructureRepresentation3D),
        PluginSpec.Action(StateTransforms.Representation.StructureSelectionsDistance3D),
        PluginSpec.Action(StateTransforms.Representation.StructureSelectionsAngle3D),
        PluginSpec.Action(StateTransforms.Representation.StructureSelectionsDihedral3D),
        PluginSpec.Action(StateTransforms.Representation.StructureSelectionsLabel3D),
        PluginSpec.Action(StateTransforms.Representation.StructureSelectionsOrientation3D),
        PluginSpec.Action(StateTransforms.Representation.ModelUnitcell3D),
        PluginSpec.Action(StateTransforms.Representation.ExplodeStructureRepresentation3D),
        PluginSpec.Action(StateTransforms.Representation.UnwindStructureAssemblyRepresentation3D),
        PluginSpec.Action(StateTransforms.Representation.OverpaintStructureRepresentation3DFromScript),
        PluginSpec.Action(StateTransforms.Representation.TransparencyStructureRepresentation3DFromScript),

        PluginSpec.Action(StateTransforms.Volume.VolumeFromCcp4),
        PluginSpec.Action(StateTransforms.Representation.VolumeRepresentation3D),
    ],
    behaviors: [
        PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci),
        PluginSpec.Behavior(DnatcoSelectLociBehaviors),
        PluginSpec.Behavior(PluginBehaviors.Representation.DefaultLociLabelProvider),
        PluginSpec.Behavior(PluginBehaviors.Camera.FocusLoci),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.AccessibleSurfaceArea),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.Interactions),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.SecondaryStructure),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.ValenceModel),
    ],
    customParamEditors: [
        [CreateVolumeStreamingBehavior, VolumeStreamingCustomControls]
    ]
};
