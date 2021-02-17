/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import { Identifiers as ID } from './identifiers';
import { Selecting } from './selecting';
import { ResidueInfo } from './steps';
import { OrderedSet } from '../../mol-data/int';
import { StateBuilder } from '../../mol-state';
import { Sphere3D } from '../../mol-math/geometry';
import { Vec3 } from '../../mol-math/linear-algebra';
import { Volume } from '../../mol-model/volume';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginContext } from '../../mol-plugin/context';
import { PluginStateObject as PSO } from '../../mol-plugin-state/objects';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { createStructureRepresentationParams } from '../../mol-plugin-state/helpers/structure-representation-params';
import { StructureSelectionCategory, StructureSelectionQuery } from '../../mol-plugin-state/helpers/structure-selection-query';
import { VolumeRepresentation3DHelpers } from '../../mol-plugin-state/transforms/representation';
import { StructureRepresentationRegistry as SRR } from '../../mol-repr/structure/registry';
import { Mat4 } from '../../mol-math/linear-algebra';
import { StructureElement, StructureProperties } from '../../mol-model/structure';
import { Color } from '../../mol-util/color';
import { ColorNames } from '../../mol-util/color/names';
import { ParamDefinition as PD } from '../../mol-util/param-definition';
import { uint8ToString } from '../../mol-io/common/binary';
import { Script } from '../../mol-script/script';
import { MolScriptBuilder as MS } from '../../mol-script/language/builder';
import { Expression } from '../../mol-script/language/expression';
import { SyncRuntimeContext } from '../../mol-task/execution/synchronous';
import { ungzip } from '../../mol-util/zip/zip';
import { NtcBallsRepresentationProvider, NtcBallsRepresentationParams } from '../../extensions/dnatco/ntc-balls/representation';
import { NtcBallsColorThemeProvider, NtcBallsColorThemeParams } from '../../extensions/dnatco/ntc-balls/color';
import { ConfalPyramidsRepresentationProvider } from '../../extensions/dnatco/confal-pyramids/representation';
import { ConfalPyramidsColorThemeProvider, ConfalPyramidsColorThemeParams } from '../../extensions/dnatco/confal-pyramids/color';
import { ConfalPyramidsParams } from '../../extensions/dnatco/confal-pyramids/representation';

import { ColorTheme } from '../../mol-theme/color';

export type DensityDataType = 'em' | 'x-ray';
export type SupportedFormats = 'cif' | 'pdb';

const AsmRef = ID.mkRef(ID.Assembly);

export namespace Util {
    function cifToTrajectory(b: StateBuilder.To<PSO.Data.Binary | PSO.Data.String>) {
        return b.apply(StateTransforms.Data.ParseCif).apply(StateTransforms.Model.TrajectoryFromMmCif);
    }

    function pdbToTrajectory(b: StateBuilder.To<PSO.Data.String | PSO.Data.Binary>) {
        return b.apply(StateTransforms.Model.TrajectoryFromPDB);
    }

    function makeDensityMapLink(loc: string, source: DensityDataType, sphere?: Sphere3D) {
        if (!sphere) {
            return `https://dnatco.datmos.org/maps/${loc}/cell/?encoding=bcif`;
        } else {
            const center = sphere.center;
            const diag = Vec3.create(sphere.radius, sphere.radius, sphere.radius);
            const a = Vec3.zero();
            const b = Vec3.zero();

            Vec3.sub(a, center, diag);
            Vec3.add(b, center, diag);

            const link = `https://dnatco.datmos.org/maps/${loc}/box/${a[0]},${a[1]},${a[2]}/${b[0]},${b[1]},${b[2]}/?encoding=bcif`;
            console.log(link);
            return link;
        }
    }

    function makeDensityMapVisualParams(ctx: PluginContext, sigma: number, alpha: number, color: Color, asWireframe: boolean) {
        return VolumeRepresentation3DHelpers.getDefaultParamsStatic(
            ctx,
            'isosurface',
            { isoValue: Volume.IsoValue.relative(sigma), alpha, visuals: [ asWireframe ? 'wireframe' : 'solid' ] },
            'uniform',
            { value: color }
        );
    }

    function makeBallsParameters(ctx: PluginContext, colors: Map<string, Color>, visible: Map<string, boolean>, transparent: boolean) {
        let typeParams = {} as PD.Values<NtcBallsRepresentationParams>;
        for (const k of Reflect.ownKeys(NtcBallsRepresentationParams) as (keyof NtcBallsRepresentationParams)[]) {
            if (NtcBallsRepresentationParams[k].type === 'boolean')
                (typeParams[k] as any) = visible.get(k) ?? NtcBallsRepresentationParams[k]['defaultValue'];
        }
        typeParams.alpha = transparent ? 0.5 : 1.0;

        let colorParams = {} as PD.Values<NtcBallsColorThemeParams>;
        for (const k of Reflect.ownKeys(NtcBallsColorThemeParams) as (keyof NtcBallsColorThemeParams)[]) {
            colorParams[k] = colors.get(k) ?? NtcBallsColorThemeParams[k]['defaultValue'];
        }

        const params = createStructureRepresentationParams(
            ctx,
            void 0,
            {
                type: NtcBallsRepresentationProvider,
                typeParams,
                color: NtcBallsColorThemeProvider,
                colorParams,
            }
        );

        return params;
    }

    function makePyramidsParameters(ctx: PluginContext, colors: Map<string, Color>, visible: Map<string, boolean>, transparent: boolean) {
        let typeParams = {} as PD.Values<ConfalPyramidsParams>;
        for (const k of Reflect.ownKeys(ConfalPyramidsParams) as (keyof ConfalPyramidsParams)[]) {
            if (ConfalPyramidsParams[k].type === 'boolean')
                (typeParams[k] as any) = visible.get(k) ?? ConfalPyramidsParams[k]['defaultValue'];
        }
        typeParams.alpha = transparent ? 0.5 : 1.0;

        let colorParams = {} as PD.Values<ConfalPyramidsColorThemeParams>;
        for (const k of Reflect.ownKeys(ConfalPyramidsColorThemeParams) as (keyof ConfalPyramidsColorThemeParams)[]) {
            colorParams[k] = colors.get(k) ?? ConfalPyramidsColorThemeParams[k]['defaultValue'];
        }

        const params = createStructureRepresentationParams(
            ctx,
            void 0,
            {
                type: ConfalPyramidsRepresentationProvider,
                typeParams,
                color: ConfalPyramidsColorThemeProvider,
                colorParams,
            }
        );

        return params;
    }

    function makeVisualParams(ctx: PluginContext, repr: SRR.BuiltIn, color?: Color) {
        const colorTheme = color ? 'uniform' : repr === 'ball-and-stick' ? 'element-symbol' : 'unit-index';

        return createStructureRepresentationParams(
            ctx,
            void 0,
            {
                type: repr,
                color: colorTheme,
                colorParams: (() => {
                    if (color !== undefined)
                        return { value: color };
                    if (colorTheme === 'element-symbol')
                        return { carbonColor: 'element-symbol' };
                    return {};
                })()
            }
        );
    }

    function modelToTrajectory(b: any, format: SupportedFormats) {
        switch (format) {
            case 'cif':
                return cifToTrajectory(b);
            case 'pdb':
                return pdbToTrajectory(b);
        }
    }

    function trajectoryFromRawData(b: StateBuilder.To<PSO.Root>, data: string, format: SupportedFormats): StateBuilder.To<PSO.Molecule.Trajectory> {
        let bb = b.apply(StateTransforms.Data.RawData, { data });
        return modelToTrajectory(bb, format);
    }

    export async function addSelectedStructure(ctx: PluginContext, expression: Expression, tag: string) {
        const ref = ID.mkRef(ID.Structure, tag);
        await removeIfPresent(ctx, [ ref ]);

        const state = ctx.state.data;
        let b = state.build().to(AsmRef);
        return b.apply(
            StateTransforms.Model.StructureSelectionFromExpression,
            { expression },
            { ref }
        );
    }

    export function compoundOfResidue(structure: PSO.Molecule.Structure, info: ResidueInfo) {
        const scr = Selecting.residueSelectionScript(info);
        const loci = Script.toLoci(scr, structure.data);
        if (loci.elements.length < 1)
            return null;
        return StructureProperties.atom.auth_comp_id(lociToLocation(loci));
    }

    export async function densityMapData(ctx: PluginContext, loc: string, dataType: DensityDataType, sphere?: Sphere3D) {
        await removeDensityMapVisual(ctx);
        await removeIfPresent(ctx, [ID.DensityFile]);

        if (loc === '')
            return;

        const url = makeDensityMapLink(loc, dataType, sphere);

        console.log(`Density map url: ${url}`);

        let b = ctx.state.data.build().toRoot();
        const fileCell = await b.apply(StateTransforms.Data.Download, { url, isBinary: true }, { ref: ID.DensityFile }).commit();
        if (!fileCell.isOk)
            return; // Density data is not available

        const cifCell = await ctx.build().to(fileCell).apply(StateTransforms.Data.ParseCif, { ref: ID.DensityData }).commit();

        const blocks = cifCell.obj!.data.blocks.slice(1);
        b = ctx.build().to(cifCell);
        // One block means that we have just density map, two blocks mean that we have both density map and difference map
        if (blocks.length > 0)
            b.apply(StateTransforms.Volume.VolumeFromDensityServerCif, { blockHeader: blocks[0].header }, { ref: ID.DensityMap });
        if (blocks.length > 1)
            b.apply(StateTransforms.Volume.VolumeFromDensityServerCif, { blockHeader: blocks[1].header }, { ref: ID.DensityDifference });
        if (blocks.length > 2)
            throw new Error('unknown number of blocks');

        await b.commit();
    }

    export async function densityMapVisual(ctx: PluginContext, sigma: number, alpha: number, showDiff: boolean, asWireframe: boolean) {
        const tree = ctx.build();

        if (!tree.currentTree.children.has(ID.DensityMap))
            return; // No density map data

        const baseColor = asWireframe ? ColorNames.black : ColorNames.bisque;

        const baseParams = makeDensityMapVisualParams(ctx, sigma, alpha, baseColor, asWireframe);
        tree.to(ID.DensityMap).apply(StateTransforms.Representation.VolumeRepresentation3D, baseParams, { ref: ID.DensityMapVisual });

        if (tree.currentTree.children.has(ID.DensityDifference) && showDiff) {
            // We have difference map
            const posParams = makeDensityMapVisualParams(ctx, sigma, alpha * 0.5, ColorNames.blue, asWireframe);
            tree.to(ID.DensityDifference).apply(StateTransforms.Representation.VolumeRepresentation3D, posParams, { ref: ID.DensityPosDifVisual });

            const negParams = makeDensityMapVisualParams(ctx, -sigma, alpha * 0.5, ColorNames.red, asWireframe);
            tree.to(ID.DensityDifference).apply(StateTransforms.Representation.VolumeRepresentation3D, negParams, { ref: ID.DensityNegDifVisual });
        }

        await tree.commit();
    }

    export async function densityMapDiffVisual(ctx: PluginContext, sigma: number, alpha: number, asWireframe: boolean) {
        const tree = ctx.build();

        if (tree.currentTree.children.has(ID.DensityDifference)) {
            // We have difference map
            const posParams = makeDensityMapVisualParams(ctx, sigma, alpha * 0.5, ColorNames.blue, asWireframe);
            tree.to(ID.DensityDifference).apply(StateTransforms.Representation.VolumeRepresentation3D, posParams, { ref: ID.DensityPosDifVisual });

            const negParams = makeDensityMapVisualParams(ctx, -sigma, alpha * 0.5, ColorNames.red, asWireframe);
            tree.to(ID.DensityDifference).apply(StateTransforms.Representation.VolumeRepresentation3D, negParams, { ref: ID.DensityNegDifVisual });
        }

        await tree.commit();
    }

    export function getBaseAssembly(ctx: PluginContext): PSO.Molecule.Structure {
        let state = ctx.state.data;
        if (!state.transforms.has(AsmRef))
            throw new Error('Assembly reference not found in current data state');
        return state.select(AsmRef)[0].obj as PSO.Molecule.Structure;
    }

    export async function getModel(ctx: PluginContext, b: StateBuilder.To<PSO.Root>, url: string, format: SupportedFormats, gzipped: boolean, modelIndex = 0, tag?: string) {
        let bb = await (async () => {
            if (gzipped) {
                const blob = await ctx.fetch({url, type: 'binary'}).runInContext(SyncRuntimeContext);
                const inflated = uint8ToString(await ungzip(SyncRuntimeContext, blob));

                return trajectoryFromRawData(b, inflated, format);
            } else {
                let _b = b.apply(StateTransforms.Data.Download, { url, isBinary: false });
                return modelToTrajectory(_b, format);
            }
        })();

        return bb.apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex }, { ref: ID.mkRef(ID.Model, tag) });
    }

    export function getModelFromRawData(b: StateBuilder.To<PSO.Root>, data: string, format: SupportedFormats, modelIndex = 0, tag?: string) {
        b = trajectoryFromRawData(b, data, format);

        return b.apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex }, { ref: ID.mkRef(ID.Model, tag) });
    }

    export function getNumberOfModels(ctx: PluginContext) {
        const state = ctx.state.data;
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

    export function lociToLocation(loci: StructureElement.Loci) {
        const lociElement = loci.elements[0];
        const unitElements = lociElement.unit.elements;
        const lociIndices = lociElement.indices;
        const eIFirst = unitElements[OrderedSet.getAt(lociIndices, 0)];
        return StructureElement.Location.create(loci.structure, loci.elements[0].unit, eIFirst);
    }

    export async function removeDensityMapDiffVisual(ctx: PluginContext) {
        await Util.removeIfPresent(ctx, [ID.DensityPosDifVisual, ID.DensityNegDifVisual]);
    }

    export async function removeDensityMapVisual(ctx: PluginContext) {
        await Util.removeIfPresent(ctx, [ID.DensityMapVisual, ID.DensityPosDifVisual, ID.DensityNegDifVisual]);
    }

    export async function removeIfPresent(ctx: PluginContext, refs: string[]) {
        const state = ctx.state.data;
        let b = state.build();
        for (let ref of refs) {
            if (state.transforms.has(ref)) {
                b.delete(ref);
            }
        }

        await PluginCommands.State.Update(ctx, { state, tree: b });
    }

    export function structure(b: StateBuilder.To<PSO.Molecule.Model>, assemblyId?: string, tag?: string): StateBuilder.To<PSO.Molecule.Structure> {
        const props = {
            type: {
                name: 'assembly' as const,
                params: { id: assemblyId || 'deposited' }
            }
        };

        return b.apply(StateTransforms.Model.CustomModelProperties, { autoAttach: [], properties: {} }, { ref: ID.mkRef(ID.Properties, tag), state: { isGhost: false } })
            .apply(
                StateTransforms.Model.StructureFromModel,
                props,
                { ref: ID.mkRef(ID.Assembly, tag) }
            );
    }

    export function transform(b: StateBuilder.To<PSO.Molecule.Structure>, matrix: Mat4, tag?: string) {
        return b.apply(
            StateTransforms.Model.TransformStructureConformation,
            { transform: { name: 'matrix', params: { data: matrix, transpose: false } } },
            { ref: ID.mkRef(ID.Transformation, tag) }
        );
    }

    export async function updateBallsVisual(ctx: PluginContext, colors: Map<string, Color>, visible: Map<string, boolean>, transparent: boolean) {
        /* Do not update balls if there aren't any */
        if (ctx === undefined)
            return;
        if (!ctx.state.data.cells.has(ID.mkRef(ID.SCE, ID.Balls)))
            return;

        const params = makeBallsParameters(ctx, colors, visible, transparent);

        let b = ctx.state.data.build().to(ID.mkRef(ID.Visual, ID.Balls));
        b.update(params).commit();
    }

    export async function updatePyramidsVisual(ctx: PluginContext, colors: Map<string, Color>, visible: Map<string, boolean>, transparent: boolean) {
        /* Do not update pyramids if there aren't any */
        if (ctx === undefined)
            return;
        if (!ctx.state.data.cells.has(ID.mkRef(ID.SCE, ID.Confal)))
            return;

        const params = makePyramidsParameters(ctx, colors, visible, transparent);

        let b = ctx.state.data.build().to(ID.mkRef(ID.Visual, ID.Confal));
        b.update(params).commit();
    }

    export async function updateDensityMapVisual(ctx: PluginContext, sigma: number, alpha: number, asWireframe: boolean) {
        if (ctx === undefined)
            return;

        const state = ctx.state.data;
        const cells = state.cells;
        if (!cells.has(ID.DensityMapVisual))
            return;

        let b = state.build();

        const baseColor = asWireframe ? ColorNames.black : ColorNames.bisque;

        const map = b.to(ID.DensityMapVisual);
        b = map.update(makeDensityMapVisualParams(ctx, sigma, alpha, baseColor, asWireframe));

        if (cells.has(ID.DensityPosDifVisual)) {
            const pos = b.to(ID.DensityPosDifVisual);
            b = pos.update(makeDensityMapVisualParams(ctx, sigma, alpha * 0.5, ColorNames.blue, asWireframe));
        }
        if (cells.has(ID.DensityNegDifVisual)) {
            const neg = b.to(ID.DensityNegDifVisual);
            b = neg.update(makeDensityMapVisualParams(ctx, -sigma, alpha * 0.5, ColorNames.red, asWireframe));
        }

        PluginCommands.State.Update(ctx, { state, tree: b });
    }

    export function updateNotSelectedVisual(ctx: PluginContext, repr: SRR.BuiltIn) {
        const ref = ID.mkRef(ID.Visual, ID.NotSelected);

        if (!ctx.state.data.cells.has(ref))
            return;

        const b = ctx.state.data.build().to(ref);
        b.update(makeVisualParams(ctx, repr)).commit();
    }

    export function updateProteinVisual(ctx: PluginContext, repr: SRR.BuiltIn) {
        const ref = ID.mkRef(ID.Visual, ID.Protein);

        if (!ctx.state.data.cells.has(ref))
            return;

        const b = ctx.state.data.build().to(ref);
        b.update(createStructureRepresentationParams(ctx, void 0, { type: repr })).commit();
    }

    export function visual(ctx: PluginContext, b: StateBuilder.To<PSO.Molecule.Structure>, repr: SRR.BuiltIn, tag: string, color?: Color) {
        b = b.apply(
            StateTransforms.Model.StructureComplexElement,
            { type: 'nucleic' },
            { ref: ID.mkRef(ID.SCE, tag) }
        );

        return b.apply(
            StateTransforms.Representation.StructureRepresentation3D,
            makeVisualParams(ctx, repr, color),
            { ref: ID.mkRef(ID.Visual, tag) }
        );
    }

    export function visualBalls(ctx: PluginContext, b: StateBuilder.To<PSO.Molecule.Structure>, colors: Map<string, Color>, visible: Map<string, boolean>, transparent: boolean) {
        b = b.apply(
            StateTransforms.Model.StructureComplexElement,
            { type: 'nucleic' },
            { ref: ID.mkRef(ID.SCE, ID.Balls) }
        );

        return b.apply(
            StateTransforms.Representation.StructureRepresentation3D,
            makeBallsParameters(ctx, colors, visible, transparent),
            { ref: ID.mkRef(ID.Visual, ID.Balls) }
        );
    }

    export function visualHetero(ctx: PluginContext, b: StateBuilder.To<PSO.Molecule.Structure>, repr: SRR.BuiltIn) {
        const query = StructureSelectionQuery('Ligand', MS.struct.modifier.union([
            MS.struct.combinator.merge([
                MS.struct.modifier.union([
                    MS.struct.generator.atomGroups({
                        'entity-test': MS.core.logic.and([
                            MS.core.rel.eq([MS.ammp('entityType'), 'non-polymer']),
                            MS.core.logic.not([MS.core.str.match([
                                MS.re('oligosaccharide', 'i'),
                                MS.ammp('entitySubtype')
                            ])])
                        ]),
                        'chain-test': MS.core.rel.eq([MS.ammp('objectPrimitive'), 'atomistic']),
                        'residue-test': MS.core.logic.not([
                            MS.core.str.match([MS.re('saccharide', 'i'), MS.ammp('chemCompType')])
                        ])
                    })
                ]),
                MS.struct.modifier.union([
                    MS.struct.generator.atomGroups({
                        'entity-test': MS.core.rel.eq([MS.ammp('entityType'), 'polymer']),
                        'chain-test': MS.core.rel.eq([MS.ammp('objectPrimitive'), 'atomistic']),
                        'residue-test': MS.core.str.match([
                            MS.re('non-polymer|(amino|carboxy) terminus|peptide-like', 'i'),
                            MS.ammp('chemCompType')
                        ])
                    })
                ])
            ]),
        ]), { category: StructureSelectionCategory.Type });

        b = b.apply(
            StateTransforms.Model.StructureSelectionFromExpression,
            { expression: query.expression },
            { ref: ID.mkRef(ID.SCE, ID.Hetero) }
        );

        return b.apply(
            StateTransforms.Representation.StructureRepresentation3D,
            createStructureRepresentationParams(
                ctx,
                void 0,
                {
                    type: repr,
                    ...(repr === 'ball-and-stick' ? { color: 'element-symbol' as ColorTheme.BuiltIn, colorParams: { carbonColor: 'element-symbol' } } : {}),
                }
            ),
            { ref: ID.mkRef(ID.Visual, ID.Hetero) }
        );
    }

    export function visualProtein(ctx: PluginContext, b: StateBuilder.To<PSO.Molecule.Structure>, repr: SRR.BuiltIn) {
        b = b.apply(
            StateTransforms.Model.StructureComplexElement,
            { type: 'protein' },
            { ref: ID.mkRef(ID.SCE, ID.Protein) }
        );

        return b.apply(
            StateTransforms.Representation.StructureRepresentation3D,
            createStructureRepresentationParams(ctx, void 0, { type: repr }),
            { ref: ID.mkRef(ID.Visual, ID.Protein) }
        );
    }

    export function visualPyramids(ctx: PluginContext, b: StateBuilder.To<PSO.Molecule.Structure>, colors: Map<string, Color>, visible: Map<string, boolean>, transparent: boolean) {
        b = b.apply(
            StateTransforms.Model.StructureComplexElement,
            { type: 'nucleic' },
            { ref: ID.mkRef(ID.SCE, ID.Confal) }
        );

        return b.apply(
            StateTransforms.Representation.StructureRepresentation3D,
            makePyramidsParameters(ctx, colors, visible, transparent),
            { ref: ID.mkRef(ID.Visual, ID.Confal) }
        );
    }

    export function visualWater(ctx: PluginContext, b: StateBuilder.To<PSO.Molecule.Structure>) {
        b = b.apply(
            StateTransforms.Model.StructureComplexElement,
            { type: 'water' },
            { ref: ID.mkRef(ID.SCE, ID.Water) }
        );

        return b.apply(
            StateTransforms.Representation.StructureRepresentation3D,
            createStructureRepresentationParams(ctx, void 0, { type: 'ball-and-stick' }),
            { ref: ID.mkRef(ID.Visual, ID.Water) }
        );
    }

    export async function visualiseNotSelected(ctx: PluginContext, script: Script, repr: SRR.BuiltIn) {
        await removeIfPresent(ctx, [ID.mkRef(ID.SCE, ID.NotSelected), ID.mkRef(ID.Visual, ID.NotSelected)]);

        let b = (await addSelectedStructure(ctx, Script.toExpression(script), ID.NotSelected));
        return visual(ctx, b, repr, ID.NotSelected);
    }

    export async function visualiseSelected(ctx: PluginContext, expr: Expression) {
        await removeIfPresent(ctx, [ID.mkRef(ID.SCE, ID.Selected), ID.mkRef(ID.Visual, ID.Selected)]);

        let b = (await addSelectedStructure(ctx, expr, ID.Selected));
        return visual(ctx, b, 'ball-and-stick', ID.Selected);
    }
}
