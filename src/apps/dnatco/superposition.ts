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
    function addReference(b: StateBuilder.To<PSO.Root>, ref: References, id: string) {
        const pdb = ReferencePdbs.data[ref];
        const model = Util.getModelFromRawData(b, pdb, 'pdb', 0, id);
        return Util.structure(model, id);
    }

    async function addReferenceStructures(ctx: PluginContext, prevLoci: StructureElement.Loci|undefined, prevRef: References|undefined, currRef: References, nextLoci: StructureElement.Loci|undefined, nextRef: References|undefined) {
        let b = ctx.state.data.build().toRoot();

        if (prevLoci && prevRef)
            b = addReference(b, prevRef, ID.PreviousSuperposed);

        b = addReference(b, currRef, ID.Superposed);

        if (nextLoci && nextRef)
            b = addReference(b, nextRef, ID.NextSuperposed);

        await PluginCommands.State.Update(ctx, { state: ctx.state.data, tree: b });
    }

    function addSuperposed(ctx: PluginContext, b: StateBuilder.To<PSO.Root>, loci: StructureElement.Loci, ref: References, id: string, clr: Color) {
        /* Check if the step backbone is sensible */
        const info = Steps.lociToStepInfo(loci);

        const structure: PSO.Molecule.Structure = Util.getBaseModel(ctx);
        const refRings = CUtil.referenceRingTypes(ref);

        /* Select reference conformer backbone */
        const refStructure: PSO.Molecule.Structure = ctx.state.data.select(ID.mkRef(ID.BaseModel, id))[0].obj!;
        const refBackbone = Selecting.selectBackbone(refStructure, refRings[0], refRings[1], 1, 2, null, null, null, null, null);

        /* Select step backbone */
        const firstRing = compoundRingTypes.get(info.compoundFirst)!;
        const secondRing = compoundRingTypes.get(info.compoundSecond)!;
        const backbone = Selecting.selectBackbone(structure, firstRing, secondRing, info.resnoFirst, info.resnoSecond, info.asymId, info.altIdFirst, info.altIdSecond, info.insCodeFirst, info.insCodeSecond);

        const xfrms = superpose([ backbone, refBackbone ]);
        let bb = b.to(ID.mkRef(ID.BaseModel, id));
        bb = Util.transform(bb, xfrms[0].bTransform, id);
        bb = Util.visual(ctx, bb, 'ball-and-stick', id, clr);

        return { rmsd: xfrms[0].rmsd, b: bb };
    }

    async function addSuperposedStructures(ctx: PluginContext, prevLoci: StructureElement.Loci|undefined, prevRef: References|undefined, currLoci: StructureElement.Loci, currRef: References, nextLoci: StructureElement.Loci|undefined, nextRef: References|undefined) {
        let b = ctx.state.data.build().toRoot();

        if (prevLoci && prevRef)
            b = addSuperposed(ctx, b, prevLoci, prevRef, ID.PreviousSuperposed, DarkBlue).b.toRoot();

        const ret = addSuperposed(ctx, b, currLoci, currRef, ID.Superposed, Green);
        b = ret.b.toRoot();

        if (nextLoci && nextRef)
            b = addSuperposed(ctx, b, nextLoci, nextRef, ID.NextSuperposed, Cyan).b;

        await PluginCommands.State.Update(ctx, { state: ctx.state.data, tree: b });

        return ret.rmsd;
    }

    export async function superposeReferenceConformer(ctx: PluginContext, prevInfo: StepInfo|null, info: StepInfo, nextInfo: StepInfo|null, prevRef?: References, currRef?: References, nextRef?: References) {
        await removeSuperposed(ctx);

        if (!currRef)
            return 0;

        const structure: PSO.Molecule.Structure = Util.getBaseModel(ctx);

        const currLoci = Selecting.selectStep(structure, info);
        const nextLoci = nextInfo ? Selecting.selectStep(structure, nextInfo) : undefined;
        const prevLoci = prevInfo ? Selecting.selectStep(structure, prevInfo) : undefined;

        await addReferenceStructures(ctx, prevLoci, prevRef, currRef, nextLoci, nextRef);

        return (await addSuperposedStructures(ctx, prevLoci, prevRef, currLoci, currRef, nextLoci, nextRef));
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
