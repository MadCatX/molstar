/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { Util } from './util';
import { StructureElement, StructureProperties } from '../../mol-model/structure';
import { PluginContext } from '../../mol-plugin/context';

export namespace DnatcoNaming {
    function makeModelNum(loc: StructureElement.Location, ctx: PluginContext) {
        const modelCount = Util.getNumberOfModels(ctx);
        if (modelCount === 1)
            return '';

        const modelNum = StructureProperties.unit.model_num(loc);

        return modelNum ? `-m${modelNum}` : '';
    }

    export function makeResidueId(loc: StructureElement.Location) {
        const compId = StructureProperties.atom.auth_comp_id(loc);

        let labelAlt = StructureProperties.atom.label_alt_id(loc);
        labelAlt = labelAlt ? `.${labelAlt}` : '';

        let insCode = StructureProperties.residue.pdbx_PDB_ins_code(loc);
        insCode = insCode ? `.${insCode}` : '';

        const seqId = StructureProperties.residue.auth_seq_id(loc);

        return `${compId}${labelAlt}_${seqId}${insCode}`;
    }

    export function makeStepId(loc: StructureElement.Location, residueFirst: string, residueSecond: string, ctx: PluginContext) {
        const entryId = loc.unit.model.entry.toLowerCase();
        const chainId = StructureProperties.chain.auth_asym_id(loc);
        const modelNum = makeModelNum(loc, ctx);

        return `${entryId}${modelNum}_${chainId}_${residueFirst}_${residueSecond}`;
    }
}
