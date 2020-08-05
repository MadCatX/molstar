/**
 * Copyright (c) 2019-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý (michal.maly@ibt.cas.cz)
 * @author Jiří Černý (jiri.cerny@ibt.cas.cz)
 */

import './index.html';
import { References } from './conformers';
import { Identifiers as ID } from './identifiers';
import { Selecting } from './selecting';
import { StepInfo, Steps } from './steps';
import { Superposition } from './superposition';
import { Util, SupportedFormats, DensityDataType } from './util';
import { DnatcoPluginSpec } from './dnatcopluginspec';
import { Sphere3D } from '../../mol-math/geometry';
import { Loci } from '../../mol-model/loci';
import { createPlugin } from '../../mol-plugin';
import { PluginContext } from '../../mol-plugin/context';
import { PluginCommands } from '../../mol-plugin/commands';
import { InteractivityManager } from '../../mol-plugin-state/manager/interactivity';
import { UpdateTrajectory } from '../../mol-plugin-state/actions/structure';
import { DnatcoConfalPyramids } from '../../extensions/dnatco';
import { PluginSpec } from '../../mol-plugin/spec';
import { StructureRepresentationRegistry as SRR } from '../../mol-repr/structure/registry';
import { Color } from '../../mol-util/color';
import { ObjectKeys } from '../../mol-util/type-helpers';

type LoadParams = {
    url: string,
    code: string,
    format: SupportedFormats,
    gzipped: boolean
};

type DnatcoEventHandlers = {
    id: 'loci-selected', func: (_: string) => void } | { id: 'dummy', func: () => void
};

const Extensions = {
    'confal-pyramids-prop': PluginSpec.Behavior(DnatcoConfalPyramids)
};

const DefaultViewerOptions = {
    extensions: ObjectKeys(Extensions)
};

const AsmRef = ID.mkRef(ID.Assembly);
const MinimumRadiusRatio = 0.30;

class DnatcoWrapper {
    private DnatcoPluginSpecImpl = { ...DnatcoPluginSpec, lociSelectedCallback: (stepId: string) => { this.lociSelectedHandlerInternal(stepId); } };
    private currentSelectedStepInfo: StepInfo | null;
    private shownPrevId: string;
    private shownNextId: string;
    private currentBoundingSphere: Sphere3D | undefined;
    private lociSelectedHandler?: (stepid: string) => void = undefined;
    private currentModelIndex: number;
    private numberOfModels: number;
    private baseRadius: number;
    private radiusRatio: number;
    private densityMapLoc: string = '';
    private densityMapSigma: number = 1.5;
    private densityMapAlpha: number = 0.5;
    private showDensityDiffMap: boolean = false;
    private notSelectedRepr: SRR.BuiltIn = 'cartoon';
    private surroundingsRadius: number = 0.0;

    private showBalls: boolean = false;
    private customBallsColorMap: Map<string, Color> = new Map<string, Color>();
    private customBallsVisibleMap: Map<string, boolean> = new Map<string, boolean>();
    private ballsTransparent: boolean = false;

    private showPyramids: boolean = true;
    private customPyramidsColorMap: Map<string, Color> = new Map<string, Color>();
    private customPyramidsVisibleMap: Map<string, boolean> = new Map<string, boolean>();
    private pyramidsTransparent: boolean = false;

    plugin: PluginContext;

    init(target: HTMLElement, radiusRatio: number) {
        this.currentSelectedStepInfo = null;
        this.currentModelIndex = 0;
        this.numberOfModels = 0;
        this.baseRadius = 0;
        this.radiusRatio = radiusRatio < MinimumRadiusRatio ? MinimumRadiusRatio : radiusRatio;
        this.plugin = createPlugin(target,
            {
                ...this.DnatcoPluginSpecImpl,
                behaviors: [
                    ...this.DnatcoPluginSpecImpl.behaviors,
                    ...DefaultViewerOptions.extensions.map(e => Extensions[e]),
                ],
                layout: {
                    initial: {
                        isExpanded: false,
                        showControls: false,
                    },
                    controls: {
                    }
                }
            });
    }

    private async focusCamera(sphere: Sphere3D) {
        if (!this.plugin.canvas3d)
            return;
        const cam = this.plugin.canvas3d.camera;

        this.baseRadius = sphere.radius;
        const snapshot = cam.getFocus(sphere.center, this.baseRadius * this.radiusRatio);
        snapshot.clipFar = true;
        snapshot.fog = 0;

        PluginCommands.Camera.SetSnapshot(this.plugin, { snapshot, durationMs: 75 });
    }

    private getBoundingSphere(info: StepInfo): Sphere3D | undefined {
        const loci = Selecting.selectStep(Util.getBaseAssembly(this.plugin), info);
        return Loci.getBoundingSphere(loci);
    }

    private async lociSelectedHandlerInternal(stepId: string) {
        await this.selectStep(stepId);
        if (this.lociSelectedHandler !== undefined)
            this.lociSelectedHandler(stepId);
    }

    private makePrevNextInfo(prevId: string, nextId: string): [StepInfo|null, StepInfo|null] {
        const prevInfo = prevId === '' ? null : Steps.makeStepInfo(prevId);
        const nextInfo = nextId === '' ? null : Steps.makeStepInfo(nextId);

        return [prevInfo, nextInfo];
    }

    private setDefaultBaseRadius() {
        const structure = Util.getBaseAssembly(this.plugin);
        const sphere = Loci.getBoundingSphere(Selecting.selectAll(structure));

        this.baseRadius = sphere !== undefined ? sphere.radius : 1.01;
    }

    private async switchModel(newIndex: number) {
        if (newIndex >= this.numberOfModels)
            throw new Error('Invalid model index');

        await Util.removeIfPresent(this.plugin, [ ID.mkRef(ID.SCE, ID.Confal), ID.mkRef(ID.Visual, ID.Confal) ]);

        await PluginCommands.State.ApplyAction(this.plugin, {
            state: this.plugin.state.data,
            action: UpdateTrajectory.create({ action: 'advance', by: newIndex - this.currentModelIndex })
        });
        this.currentModelIndex = newIndex;

        let b = this.plugin.state.data.build().to(AsmRef);
        if (this.showPyramids)
            b = Util.visualPyramids(this.plugin, b, this.customPyramidsColorMap, this.customPyramidsVisibleMap, this.pyramidsTransparent);
        if (this.showBalls)
            b = Util.visualBalls(this.plugin, b, this.customPyramidsColorMap, this.customPyramidsVisibleMap, this.ballsTransparent);

        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree: b });
    }

    async clear() {
        /* Get the current dataState of the plugin */
        const state = this.plugin.state.data;

        /* Remove the current object from the state */
        await PluginCommands.State.RemoveObject(this.plugin, { state, ref: state.tree.root.ref });

        /* Make a new empty tree */
        const tree = state.build();

        /* Set the new empty tree */
        await PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree });

        /* Reset camera */
        PluginCommands.Camera.Reset(this.plugin, {});
    }

    async deselectStep() {
        this.plugin.managers.interactivity.lociSelects.deselectAll();
        this.currentSelectedStepInfo = null;
        this.currentBoundingSphere = undefined;
        this.shownPrevId = '';
        this.shownNextId = '';

        const toRemove = [
            ...Superposition.superposedRefs,
            ID.mkRef(ID.SCE, ID.Selected),
            ID.mkRef(ID.Visual, ID.Selected),
            ID.mkRef(ID.SCE, ID.NotSelected),
            ID.mkRef(ID.Visual, ID.NotSelected),
        ];

        await Util.removeIfPresent(this.plugin, toRemove);

        this.setDefaultBaseRadius();

        const tree = await Util.visualiseNotSelected(this.plugin, Selecting.SelectAllScript, this.notSelectedRepr);
        PluginCommands.State.Update(this.plugin, { state: this.plugin.state.data, tree } );
        this.resetCamera();

        this.loadDensityMap(this.showDensityDiffMap);
    }

    async focusCameraOnSelected() {
        if (this.currentBoundingSphere) {
            this.focusCamera(this.currentBoundingSphere);
            this.loadDensityMap(this.showDensityDiffMap);
        }
    }

    async load({ url, format, gzipped }: LoadParams) {
        /* Get root of the state tree */
        let b = this.plugin.state.data.build().toRoot();

        b = await Util.getModel(this.plugin, b, url, format, gzipped);
        b = Util.structure(b);
        b.commit();

        b = await Util.visualiseNotSelected(this.plugin, Selecting.SelectAllScript, this.notSelectedRepr);
        if (this.showPyramids)
            b = Util.visualPyramids(this.plugin, b.to(AsmRef), this.customPyramidsColorMap, this.customPyramidsVisibleMap, this.pyramidsTransparent);
        if (this.showBalls)
            b = Util.visualBalls(this.plugin, b.to(AsmRef), this.customBallsColorMap, this.customBallsVisibleMap, this.ballsTransparent);
        b.commit();

        const interactivityProps: Partial<InteractivityManager.Props> = { granularity: 'two-residues' };
        this.plugin.managers.interactivity.setProps(interactivityProps);

        this.numberOfModels = Util.getNumberOfModels(this.plugin);
        this.currentModelIndex = 0;
        this.setDefaultBaseRadius();

        await this.resetCamera();
    }

    async loadDensityMap(showDiff: boolean) {
        const ddt = this.densityMapLoc.split('/')[0];
        if (['em', 'x-ray'].indexOf(ddt) < 0 && ddt.length > 0)
            throw new Error(`Unknown density data type ${ddt}`);

        this.showDensityDiffMap = showDiff;

        await Util.densityMapData(this.plugin, this.densityMapLoc, ddt as DensityDataType, this.currentBoundingSphere);
        if (this.plugin.state.data.cells.has(ID.DensityFile))
            Util.densityMapVisual(this.plugin, this.densityMapSigma, this.densityMapAlpha, this.showDensityDiffMap);
    }

    async removeSuperposed() {
        Superposition.removeSuperposed(this.plugin);
    }

    async resetCamera(radiusRatio?: number) {
        if (this.plugin.canvas3d) {
            if (radiusRatio !== undefined)
                this.radiusRatio = radiusRatio < MinimumRadiusRatio ? MinimumRadiusRatio : radiusRatio;

            PluginCommands.Camera.Reset(this.plugin, { snapshot: { fog: 0, clipFar: true } });
        }
    }

    async selectStep(stepId: string) {
        this.plugin.managers.interactivity.lociSelects.deselectAll();

        const info = Steps.makeStepInfo(stepId);

        if (this.currentModelIndex !== info.modelIndex)
            await this.switchModel(info.modelIndex);

        this.currentSelectedStepInfo = info;
        this.currentBoundingSphere = this.getBoundingSphere(info);
    }

    async setCameraRadiusRatio(ratio: number) {
        if (!this.plugin.canvas3d)
            return;

        if (ratio < MinimumRadiusRatio)
            ratio = MinimumRadiusRatio;

        this.radiusRatio = ratio;

        const snapshot = this.plugin.canvas3d.camera.getSnapshot();
        if (!snapshot.clipFar)
            return;

        snapshot.radius = this.baseRadius * this.radiusRatio;
        PluginCommands.Camera.SetSnapshot(this.plugin, { snapshot, durationMs: 75 });
    }

    async setContactsDisplay(show: boolean, radius: number) {
        if (show === false)
            this.surroundingsRadius = 0;
        else {
            if (radius <= 0.0)
                throw new Error(`Invalid radius value ${radius}`);
            this.surroundingsRadius = radius;
        }

        if (this.currentSelectedStepInfo === null)
            return;

        const [prevInfo, nextInfo] = this.makePrevNextInfo(this.shownPrevId, this.shownNextId);

        (await Util.visualiseSelected(
            this.plugin,
            Selecting.selectBlock(prevInfo, this.currentSelectedStepInfo, nextInfo, this.surroundingsRadius)
        )).commit();
    }

    async setDensityMapAppearance(sigma: number, alpha: number) {
        this.densityMapSigma = sigma;
        this.densityMapAlpha = alpha;
        Util.updateDensityMapVisual(this.plugin, sigma, alpha);
    }

    setDensityMapLocator(loc: string) {
        this.densityMapLoc = loc;
    }

    setHandler(handler: DnatcoEventHandlers) {
        switch (handler.id) {
            case 'loci-selected':
                this.lociSelectedHandler = handler.func;
        }
    }

    async showSelectedAsBallAndStick(prevId: string, nextId: string) {
        if (this.currentSelectedStepInfo === null)
            return;

        this.shownPrevId = prevId;
        this.shownNextId = nextId;

        const [prevInfo, nextInfo] = this.makePrevNextInfo(this.shownPrevId, this.shownNextId);

        (await Util.visualiseNotSelected(
            this.plugin,
            Selecting.selectBlockInverse(prevInfo, this.currentSelectedStepInfo, nextInfo, true),
            this.notSelectedRepr
        )).commit();

        (await Util.visualiseSelected(
            this.plugin,
            Selecting.selectBlock(prevInfo, this.currentSelectedStepInfo, nextInfo, this.surroundingsRadius)
        )).commit();
    }

    async superpose(prevId: string, nextId: string, prevRef: string, currRef: string, nextRef: string) {
        if (this.currentSelectedStepInfo === null)
            return;

        const prev = prevRef === '' ? undefined : (prevRef as References);
        const next = nextRef === '' ? undefined : (nextRef as References);
        const curr = currRef === '' ? undefined : (currRef as References);

        const [prevInfo, nextInfo] = this.makePrevNextInfo(prevId, nextId);

        // HAKZ
        if (prevInfo)
            prevInfo.modelIndex = this.currentModelIndex;
        if (nextInfo)
            nextInfo.modelIndex = this.currentModelIndex;

        const rmsd = await Superposition.superposeReferenceConformer(this.plugin, prevInfo, this.currentSelectedStepInfo, nextInfo, prev, curr, next);

        return rmsd;
    }

    async setBallsColors(colors: { which: string, color: string }[]) {
        for ( const { which, color } of colors)
            this.customBallsColorMap.set(which, Color(parseInt(color.split('#')[1], 16)));

        Util.updateBallsVisual(this.plugin, this.customBallsColorMap, this.customBallsVisibleMap, this.ballsTransparent);
    }

    async setPyramidsColors(colors: { group: string, color: string }[]) {
        for ( const { group, color } of colors)
            this.customPyramidsColorMap.set(group, Color(parseInt(color.split('#')[1], 16)));

        Util.updatePyramidsVisual(
            this.plugin,
            this.customPyramidsColorMap,
            this.customPyramidsVisibleMap,
            this.pyramidsTransparent
        );
    }

    async showHideAllBalls(show: boolean) {
        if (show === this.showBalls) return;

        this.showBalls = show;

        if (this.showBalls) {
            Util.visualBalls(
                this.plugin,
                this.plugin.state.data.build().to(AsmRef),
                this.customBallsColorMap,
                this.customBallsVisibleMap,
                this.ballsTransparent
            ).commit();
        } else {
            Util.removeIfPresent(
                this.plugin,
                [
                    ID.mkRef(ID.SCE, ID.Balls),
                    ID.mkRef(ID.Visual, ID.Balls),
                ]
            );
        }
    }

    async showHideAllPyramids(show: boolean) {
        if (show === this.showPyramids) return;

        this.showPyramids = show;

        if (this.showPyramids) {
            Util.visualPyramids(
                this.plugin,
                this.plugin.state.data.build().to(AsmRef),
                this.customPyramidsColorMap,
                this.customPyramidsVisibleMap,
                this.pyramidsTransparent,
            ).commit();
        } else {
            Util.removeIfPresent(
                this.plugin,
                [
                    ID.mkRef(ID.SCE, ID.Confal),
                    ID.mkRef(ID.Visual, ID.Confal),
                ]
            );
        }
    }

    async toggleBallsVisible(visibility: { which: string, visible: boolean }[]) {
        for ( const { which, visible } of visibility) {
            this.customBallsVisibleMap.set(which + 'U', visible);
            this.customBallsVisibleMap.set(which + 'L', visible);
        }

        if (!this.showBalls)
            return;

        await Util.removeIfPresent(
            this.plugin,
            [
                ID.mkRef(ID.SCE, ID.Balls),
                ID.mkRef(ID.Visual, ID.Balls),
            ]
        );

        Util.visualBalls(
            this.plugin,
            this.plugin.state.data.build().to(AsmRef),
            this.customBallsColorMap,
            this.customBallsVisibleMap,
            this.ballsTransparent
        ).commit();
    }

    async togglePyramidsVisible(visibility: { group: string, visible: boolean }[]) {
        for ( const { group, visible } of visibility) {
            this.customPyramidsVisibleMap.set(group, visible);
        }

        if (!this.showPyramids)
            return;

        await Util.removeIfPresent(
            this.plugin,
            [
                ID.mkRef(ID.SCE, ID.Confal),
                ID.mkRef(ID.Visual, ID.Confal),
            ]
        );

        Util.visualPyramids(
            this.plugin,
            this.plugin.state.data.build().to(AsmRef),
            this.customPyramidsColorMap,
            this.customPyramidsVisibleMap,
            this.pyramidsTransparent
        ).commit();
    }

    async toggleDensityDifferenceMap(show: boolean) {
        this.showDensityDiffMap = show;
        if (show) {
            Util.densityMapDiffVisual(this.plugin, this.densityMapSigma, this.densityMapAlpha);
        } else {
            Util.removeDensityMapDiffVisual(this.plugin);
        }
    }

    async toggleBallsTransparent(transparent: boolean) {
        this.ballsTransparent = transparent;
        Util.updateBallsVisual(
            this.plugin,
            this.customBallsColorMap,
            this.customBallsVisibleMap,
            this.ballsTransparent
        );
    }

    async togglePyramidsTransparent(transparent: boolean) {
        this.pyramidsTransparent = transparent;
        Util.updatePyramidsVisual(
            this.plugin,
            this.customPyramidsColorMap,
            this.customPyramidsVisibleMap,
            this.pyramidsTransparent
        );
    }

    async toggleCartoon(asCartoon: boolean) {
        this.notSelectedRepr = asCartoon ? 'cartoon' : 'ball-and-stick';

        Util.updateNotSelectedVisual(this.plugin, this.notSelectedRepr);
        Util.updateProteinVisual(this.plugin, this.notSelectedRepr);
    }

    async toggleHetero(show: boolean) {
        if (show) {
            const state = this.plugin.state.data;
            let b = state.build().to(AsmRef);
            Util.visualHetero(this.plugin, b, 'ball-and-stick').commit();
        } else {
            Util.removeIfPresent(
                this.plugin,
                [
                    ID.mkRef(ID.Visual, ID.Hetero),
                    ID.mkRef(ID.SCE, ID.Hetero)
                ]
            );
        }
    }

    async toggleProtein(show: boolean) {
        if (show) {
            const state = this.plugin.state.data;
            let b = state.build().to(AsmRef);
            b = Util.visualProtein(this.plugin, b, this.notSelectedRepr);

            PluginCommands.State.Update(this.plugin, { state, tree: b });
        } else {
            Util.removeIfPresent(this.plugin, [ ID.mkRef(ID.SCE, ID.Protein), ID.mkRef(ID.Visual, ID.Protein) ]);
        }
    }

    async toggleWater(show: boolean) {
        if (show) {
            const state = this.plugin.state.data;
            let b = state.build().to(AsmRef);
            b = Util.visualWater(this.plugin, b);

            PluginCommands.State.Update(this.plugin, { state, tree: b });
        } else {
            Util.removeIfPresent(this.plugin, [ ID.mkRef(ID.SCE, ID.Water), ID.mkRef(ID.Visual, ID.Water) ]);
        }
    }
}

(window as any).DnatcoWrapper = new DnatcoWrapper();
