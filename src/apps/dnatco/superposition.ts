/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { References, Util as CUtil,  compoundRingTypes } from './conformers';
import { Identifiers as ID } from './identifiers';
import { Util } from './util';
import { ReferencePdbs } from './reference-pdbs';
import { Selecting } from './selecting';
import { Steps, StepInfo } from './steps';
import { superpose } from '../../mol-model/structure/structure/util/superposition';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StructureElement } from '../../mol-model/structure';
import { StateBuilder } from '../../mol-state';
import { Color } from '../../mol-util/color';

const Green =  Color(0x008000);
const DarkBlue = Color(0x0000FF);
const Cyan = Color(0x00FFFF);

export namespace Superposition {
    export type Step = {
        info: StepInfo;
        reference: References;
    };

    function addReference(b: StateBuilder.To<PSO.Root>, ref: References, id: string) {
        const pdb = ReferencePdbs.data[ref];
        const model = Util.getModelFromRawData(b, pdb, 'pdb', 0, id);
        return Util.structure(model, id);
    }

    async function addReferenceStructures(ctx: PluginContext, prevLoci: StructureElement.Loci|undefined, prevRef: References|undefined, currRef: References|undefined, nextLoci: StructureElement.Loci|undefined, nextRef: References|undefined) {
        let b = ctx.state.data.build().toRoot();

        if (prevLoci && prevRef)
            b = addReference(b, prevRef, ID.PreviousSuperposed);

        if (currRef)
            b = addReference(b, currRef, ID.Superposed);

        if (nextLoci && nextRef)
            b = addReference(b, nextRef, ID.NextSuperposed);

        await PluginCommands.State.Update(ctx, { state: ctx.state.data, tree: b });
    }

    function getBackbones(ctx: PluginContext, b: StateBuilder.To<PSO.Root>, loci: StructureElement.Loci, ref: References, id: string): { backbone: StructureElement.Loci, refBackbone: StructureElement.Loci } {
        /* Check if the step backbone is sensible */
        const info = Steps.lociToStepInfo(loci);

        const structure: PSO.Molecule.Structure = Util.getBaseModel(ctx);
        const refRings = CUtil.referenceRingTypes(ref);

        /* Select reference conformer backbone */
        const refStructure: PSO.Molecule.Structure = b.to(ID.mkRef(ID.BaseModel, id)).selector.obj! as PSO.Molecule.Structure;
        const refBackbone = Selecting.selectBackbone(refStructure, refRings[0], refRings[1], 1, 2, null, null, null, null, null);

        /* Select step backbone */
        const firstRing = compoundRingTypes.get(info.compoundFirst)!;
        const secondRing = compoundRingTypes.get(info.compoundSecond)!;
        const backbone = Selecting.selectBackbone(structure, firstRing, secondRing, info.resnoFirst, info.resnoSecond, info.asymId, info.altIdFirst, info.altIdSecond, info.insCodeFirst, info.insCodeSecond);

        return { backbone, refBackbone };
    }

    function addSuperposed(ctx: PluginContext, b: StateBuilder.To<PSO.Root>, loci: StructureElement.Loci, ref: References, id: string, clr: Color) {
        const { backbone, refBackbone } = getBackbones(ctx, b, loci, ref, id);

        const sup = superpose([ backbone, refBackbone ]);
        let bb = b.to(ID.mkRef(ID.BaseModel, id));
        bb = Util.transform(bb, sup[0].bTransform, id);
        bb = Util.visual(ctx, bb, 'ball-and-stick', id, clr, 0.1);

        return bb;
    }

    export async function superposedRmsd(ctx: PluginContext, step: Step, ref: References) {
        /* The sheer ridiculousness of this code did dawn on me when I wrote it... */
        const structure: PSO.Molecule.Structure = Util.getBaseModel(ctx);
        const loci = Selecting.selectStep(structure, step.info);

        let b = ctx.state.data.build().toRoot();
        b = addReference(b, ref, ID.RMSD).toRoot();
        await b.commit();

        const { backbone, refBackbone } = getBackbones(ctx, b, loci, ref, ID.RMSD);

        const sup = superpose([ backbone, refBackbone ]);
        const rmsd = sup[0].rmsd;

        b = ctx.state.data.build().toRoot();
        const toRemove = [
            ID.mkRef(ID.Model, ID.RMSD),
            ID.mkRef(ID.BaseModel, ID.RMSD),
        ];

        for (const o of toRemove)
            b.delete(o);
        await b.commit();

        return rmsd;
    }

    async function addSuperposedStructures(ctx: PluginContext, prevLoci: StructureElement.Loci|undefined, prevRef: References|undefined, currLoci: StructureElement.Loci|undefined, currRef: References|undefined, nextLoci: StructureElement.Loci|undefined, nextRef: References|undefined) {
        let b = ctx.state.data.build().toRoot();

        if (prevLoci && prevRef)
            b = addSuperposed(ctx, b, prevLoci, prevRef, ID.PreviousSuperposed, DarkBlue).toRoot();

        if (currLoci && currRef) {
            const ret = addSuperposed(ctx, b, currLoci, currRef, ID.Superposed, Green);
            b = ret.toRoot();
        }

        if (nextLoci && nextRef)
            b = addSuperposed(ctx, b, nextLoci, nextRef, ID.NextSuperposed, Cyan);

        await PluginCommands.State.Update(ctx, { state: ctx.state.data, tree: b });
    }

    export async function superposePrevCurrNextConformers(ctx: PluginContext, prev: Step|undefined, curr: Step, next: Step|undefined) {
        await removeSuperposed(ctx);

        if (curr === undefined)
            return;

        const structure: PSO.Molecule.Structure = Util.getBaseModel(ctx);

        const currLoci = Selecting.selectStep(structure, curr.info);
        const nextLoci = next ? Selecting.selectStep(structure, next.info) : undefined;
        const prevLoci = prev ? Selecting.selectStep(structure, prev.info) : undefined;

        await addReferenceStructures(ctx, prevLoci, prev?.reference, curr.reference, nextLoci, next?.reference);
        await addSuperposedStructures(ctx, prevLoci, prev?.reference, currLoci, curr.reference, nextLoci, next?.reference);
    }

    export async function superposePrevNextConformers(ctx: PluginContext, prev: Step|undefined, next: Step|undefined) {
        await removeSuperposed(ctx);

        const structure: PSO.Molecule.Structure = Util.getBaseModel(ctx);

        const nextLoci = next ? Selecting.selectStep(structure, next.info) : undefined;
        const prevLoci = prev ? Selecting.selectStep(structure, prev.info) : undefined;

        await addReferenceStructures(ctx, prevLoci, prev?.reference, undefined, nextLoci, next?.reference);
        await addSuperposedStructures(ctx, prevLoci, prev?.reference, undefined, undefined, nextLoci, next?.reference);
    }

    export const superposedRefs = [
        ID.mkRef(ID.Model, ID.PreviousSuperposed),
        ID.mkRef(ID.Model, ID.NextSuperposed),
        ID.mkRef(ID.SCE, ID.PreviousSuperposed),
        ID.mkRef(ID.SCE, ID.NextSuperposed),
        ID.mkRef(ID.Structure, ID.Superposed),
        ID.mkRef(ID.Transformation, ID.Superposed),
        ID.mkRef(ID.BaseModel, ID.Superposed),
        ID.mkRef(ID.Model, ID.Superposed),
    ];

    export async function removeSuperposed(ctx: PluginContext) {
        await Util.removeIfPresent(ctx, superposedRefs);
    }
}
