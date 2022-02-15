/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import { Collapsible } from './collapsible';
import { PushButton } from './push-button';
import { Util } from './util';
import { EmptyLoci, Loci } from '../../mol-model/loci';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { PurePluginUIComponent } from '../../mol-plugin-ui/base';
import { StructureMeasurementCell, StructureMeasurementManagerState } from '../../mol-plugin-state/manager/structure/measurement';
import { StructureSelectionHistoryEntry } from '../../mol-plugin-state/manager/structure/selection';
import { AngleData } from '../../mol-repr/shape/loci/angle';
import { DihedralData } from '../../mol-repr/shape/loci/dihedral';
import { DistanceData } from '../../mol-repr/shape/loci/distance';
import { angleLabel, dihedralLabel, distanceLabel, lociLabel } from '../../mol-theme/label';
import { FiniteArray } from '../../mol-util/type-helpers';
import './assets/imgs/x-red.svg';

export class SelectedStructureElement extends PurePluginUIComponent<SelectedStructureElement.Props, SelectedStructureElement.State> {
    constructor(props: SelectedStructureElement.Props) {
        super(props);
        this.state = { isHoveredInViewer: false };
    }

    private highlight() {
        this.props.ctx.managers.interactivity.lociHighlights.highlight(this.props.entry);
    }

    private unhighlight() {
        this.props.ctx.managers.interactivity.lociHighlights.clearHighlights();
    }

    componentDidMount() {
        this.subscribe(this.props.ctx.behaviors.interaction.hover, ev => {
            const areEqual = Loci.areEqual(ev.current.loci, this.props.entry.loci);
            if (this.state.isHoveredInViewer && !areEqual)
                this.setState({ ...this.state, isHoveredInViewer: false });
            else if (!this.state.isHoveredInViewer && areEqual)
                this.setState({ ...this.state, isHoveredInViewer: true });
        });
    }

    render() {
        const label = this.props.entry.label.split('|').slice(0, 2).join('|');
        const cls = 'wva-selected-structure-element wva-hoverable-item' + (this.state.isHoveredInViewer ? ' wva-highlighted-item' : '');
        return (
            <div className={cls}
                onMouseEnter={() => this.highlight()}
                onMouseLeave={() => this.unhighlight()}
            >
                <span dangerouslySetInnerHTML={{ __html: label }} />
                <PushButton
                    text='⇧'
                    onClick={() => {
                        this.unhighlight();
                        this.props.ctx.managers.structure.selection.modifyHistory(this.props.entry, 'up');
                    }}
                    enabled={this.props.canGoUp}
                    className=''
                    classNameDisabled=''
                    textClassName='wva-pushbutton-text-highlightable-dark'
                    textClassNameDisabled='wva-pushbutton-text-disabled'
                />
                <PushButton
                    text='⇩'
                    onClick={() => {
                        this.unhighlight();
                        this.props.ctx.managers.structure.selection.modifyHistory(this.props.entry, 'down');
                    }}
                    enabled={this.props.canGoDown}
                    className=''
                    classNameDisabled=''
                    textClassName='wva-pushbutton-text-highlightable-dark'
                    textClassNameDisabled='wva-pushbutton-text-disabled'
                />
                <PushButton
                    onClick={() => {
                        this.unhighlight();
                        this.props.ctx.managers.structure.selection.fromLoci('remove', this.props.entry.loci);
                    }}
                    className='wva-highlightable-red-pushbutton'
                    classNameDisabled=''
                >
                    <img src={`${this.props.pathPrefix}assets/imgs/x-red.svg`} />
                </PushButton>
            </div>
        );
    }
}
namespace SelectedStructureElement {
    export interface Props {
        entry: StructureSelectionHistoryEntry;
        ctx: PluginUIContext;
        canGoUp: boolean;
        canGoDown: boolean;
        pathPrefix: string;
    }
    export interface State {
        isHoveredInViewer: boolean;
    }
}

function capitalize(s: string) {
    if (s.length < 1)
        return s;
    const cap = s[0].toLocaleUpperCase();
    return cap + s.slice(1);
}

class MeasurementTag extends React.Component<{ html: string }> {
    private FormatTags = [
        { htmlTag: 'b', clsName: 'wva-added-measurement-label-bold' },
        { htmlTag: 'small', clsName: 'wva-added-measurement-label-small' },
    ];

    private getTag(s: string) {
        const found = [];

        for (const tag of this.FormatTags) {
            const idx = s.indexOf(`<${tag.htmlTag}>`);
            if (idx >= 0)
                found.push({ idx, ...tag });
        }

        if (found.length === 0)
            return undefined;

        let ret = found[0];
        for (let idx = 1; idx < found.length; idx++) {
            const item = found[idx];
            if (item.idx < ret.idx)
                ret = item;
        }

        return ret;
    }

    private parseLabel(label: string) {
        const entries: JSX.Element[] = [];

        let ctr = 0;
        while (label.length > 0) {
            const tag = this.getTag(label);
            if (!tag) {
                entries.push(<span key={ctr}>{label}</span>);
                break;
            }
            entries.push(<span key={`${ctr}_a`}>{label.slice(0, tag.idx)}</span>);

            const jdx = label.indexOf(`</${tag.htmlTag}>`);
            if (jdx < 0) {
                console.warn('Improperly structured label HTML');
                break;
            }

            const txt = label.slice(tag.idx + 3, jdx);
            entries.push(<span className={tag.clsName} key={`${ctr}_b`}>{txt}</span>);
            label = label.slice(jdx + 4);
            ctr++;
        }

        return entries;
    }

    render() {
        return (
            <div>
                {this.parseLabel(Util.replaceEvery(this.props.html, '\u2014', '-'))}
            </div>
        );
    }
}

export class AddedMeasurement extends PurePluginUIComponent<AddedMeasurement.Props, AddedMeasurement.State> {
    constructor(props: AddedMeasurement.Props) {
        super(props);

        this.state = { isHoveredInViewer: false };
    }

    private getCellSelections() {
        return this.props.cell.obj?.data.sourceData as Partial<DistanceData & AngleData & DihedralData> | undefined;
    }

    private getLociArray(): FiniteArray<Loci> {
        const sel = this.getCellSelections();
        if (!sel) return [];
        if (sel.pairs) return sel.pairs[0].loci;
        if (sel.triples) return sel.triples[0].loci;
        if (sel.quads) return sel.quads[0].loci;
        return [];
    }

    private getLabel() {
        const sel = this.getCellSelections();

        if (!sel) return lociLabel(this.props.cell.obj?.data.repr.getLoci() ?? EmptyLoci);
        if (sel.pairs) return distanceLabel(sel.pairs[0], { condensed: true });
        if (sel.triples) return angleLabel(sel.triples[0], { condensed: true });
        if (sel.quads) return dihedralLabel(sel.quads[0], { condensed: true });
        return lociLabel(this.props.cell.obj?.data.repr.getLoci() ?? EmptyLoci);
    }

    private highlightInViewer() {
        const sel = this.getCellSelections();
        if (!sel) return;

        this.props.plugin.managers.interactivity.lociHighlights.clearHighlights();
        for (const loci of this.getLociArray()) {
            this.props.plugin.managers.interactivity.lociHighlights.highlight({ loci }, false);
        }
        this.props.plugin.managers.interactivity.lociHighlights.highlight({ loci: this.props.cell.obj?.data.repr.getLoci()! }, false);
    }

    private unhighlightInViewer() {
        this.props.plugin.managers.interactivity.lociHighlights.clearHighlights();
    }

    componentDidMount() {
        this.subscribe(this.props.plugin.behaviors.interaction.hover, ev => {
            const loci = this.props.cell.obj?.data.repr.getLoci();
            const evLoci = ev.current.repr?.getLoci();
            if (!loci || !evLoci)
                return;

            if (!(evLoci.kind === 'shape-loci' || evLoci.kind === 'group-loci') || !(loci.kind === 'shape-loci' || loci.kind === 'group-loci')) {
                if (this.state.isHoveredInViewer)
                    this.setState({ ...this.state, isHoveredInViewer: false });
                return;
            }

            const areEqual = evLoci.shape.id === loci.shape.id;
            if (this.state.isHoveredInViewer && !areEqual)
                this.setState({ ...this.state, isHoveredInViewer: false });
            else if (!this.state.isHoveredInViewer && areEqual)
                this.setState({ ...this.state, isHoveredInViewer: true });
        });
    }

    render() {
        const cls = 'wva-added-measurement wva-hoverable-item' + (this.state.isHoveredInViewer ? ' wva-highlighted-item' : '');
        return (
            <div className={cls}
                onMouseEnter={e => {
                    this.highlightInViewer();
                    e.stopPropagation();
                }}
                onMouseLeave={e => {
                    this.unhighlightInViewer();
                    e.stopPropagation();
                }}
            >
                <MeasurementTag html={this.getLabel()} />
                <PushButton
                    className='wva-pushbutton wva-pushbutton-border wva-symbolic-pushbutton'
                    onClick={() => this.props.delete()}
                >
                    <img src={`${this.props.pathPrefix}assets/imgs/x-red.svg`} />
                </PushButton>
            </div>
        );
    }
}
namespace AddedMeasurement {
    export interface Deleter {
        (): void;
    }

    export interface Props {
        delete: Deleter;
        kind: string;
        cell: StructureMeasurementCell;
        plugin: PluginUIContext;
        pathPrefix: string;
    }

    export interface State {
        isHoveredInViewer: boolean;
    }
}

interface State {
    expanded: boolean;
}

export class Measurements extends PurePluginUIComponent<Measurements.Props, State> {
    constructor(props: Measurements.Props) {
        super(props);

        this.state = {
            expanded: false,
        };
    }

    private addLabel() {
        if (!this.props.plugin)
            return;
        const loci = this.props.plugin.managers.structure.selection.additionsHistory;
        this.props.plugin.managers.structure.measurement.addLabel(loci[0].loci);
    }

    private clearOrderLabels() {
        this.props.plugin?.managers.structure.measurement.addOrderLabels([]);
    }

    private measureAngle() {
        if (!this.props.plugin)
            return;
        const loci = this.props.plugin.managers.structure.selection.additionsHistory;
        this.props.plugin.managers.structure.measurement.addAngle(loci[0].loci, loci[1].loci, loci[2].loci);
    }

    private measureDihedral() {
        if (!this.props.plugin)
            return;
        const loci = this.props.plugin.managers.structure.selection.additionsHistory;
        this.props.plugin.managers.structure.measurement.addDihedral(loci[0].loci, loci[1].loci, loci[2].loci, loci[3].loci);
    }

    private measureDistance() {
        if (!this.props.plugin)
            return;
        const loci = this.props.plugin.managers.structure.selection.additionsHistory;
        this.props.plugin.managers.structure.measurement.addDistance(loci[0].loci, loci[1].loci);
    }

    private measurementsInner(cells: StructureMeasurementCell[], kind: string) {
        const entries: JSX.Element[] = [];
        if (cells.length === 0)
            return [];

        entries.push(<div className='wva-measurements-section-caption' key={kind}>{kind}</div>);
        for (const c of cells) {
            entries.push(
                <AddedMeasurement
                    key={c.transform.ref}
                    kind={kind}
                    cell={c}
                    plugin={this.props.plugin!}
                    pathPrefix={this.props.pathPrefix}
                    delete={() => {
                        PluginCommands.State.RemoveObject(this.props.plugin!, { state: c.parent!, ref: c.transform.parent, removeParentGhosts: true })
                            .then(() => Util.triggerResize());
                    }}
                />
            );
        }

        return entries;
    }

    private measurements() {
        if (!this.props.plugin)
            return [];

        const measurements = this.props.plugin.managers.structure.measurement.state;
        const entries: JSX.Element[] = [];

        for (const kind of ['labels', 'distances', 'angles', 'dihedrals'] as (keyof typeof measurements)[])
            entries.push(...this.measurementsInner(measurements[kind] as StructureMeasurementCell[], capitalize(kind)));

        return entries;
    }

    private removeAll() {
        if (!this.props.plugin)
            return;

        Measurements.removeAllMeasurements(this.props.plugin);
    }

    private selections() {
        if (!this.props.plugin)
            return;
        const history = this.props.plugin.managers.structure.selection.additionsHistory;

        const entries: JSX.Element[] = [];
        for (let idx = 0; idx < 4 && idx < history.length; idx++) {
            const e = history[idx];
            entries.push(
                <SelectedStructureElement
                    key={e.id}
                    ctx={this.props.plugin!}
                    entry={e}
                    canGoUp={idx > 0}
                    canGoDown={idx < history.length - 1}
                    pathPrefix={this.props.pathPrefix}
                />
            );
        }
        return entries.length === 0 ? (<div>(Nothing selected)</div>) : entries;
    }

    private setupSubscription() {
        if (!this.props.plugin)
            return;

        this.subscribe(this.props.plugin.managers.structure.selection.events.additionsHistoryUpdated, () => {
            this.updateOrderLabels();
            Util.triggerResize();
            this.forceUpdate();
        });
        this.subscribe(this.props.plugin.managers.structure.measurement.behaviors.state, () => {
            Util.triggerResize();
            this.forceUpdate();
        });
    }

    private updateOrderLabels() {
        if (!this.state.expanded) {
            this.clearOrderLabels();
            return;
        }

        const locis = [];
        const history = this.props.plugin!.managers.structure.selection.additionsHistory;
        for (let idx = 0; idx < history.length && idx < 4; idx++)
            locis.push(history[idx].loci);
        this.props.plugin!.managers.structure.measurement.addOrderLabels(locis);
    }

    componentDidMount() {
        this.setupSubscription();
    }

    componentDidUpdate(prevProps: Measurements.Props, prevState: State) {
        if (prevProps.plugin !== this.props.plugin) {
            this.setupSubscription();
        }
        if (this.props.plugin && this.state.expanded !== prevState.expanded) {
            this.updateOrderLabels();
            Util.triggerResize();
        }
    }

    render() {
        const history = this.props.plugin?.managers.structure.selection.additionsHistory ?? [];

        return (
            <Collapsible
                caption='Labels and Measurements'
                initialState='collapsed'
                orientation={this.props.orientation}
                dontGrow={true}
                onStateChanged={ isCollapsed => this.setState({ ...this.state, expanded: !isCollapsed }) }
                pathPrefix={this.props.pathPrefix}
            >
                <div className={`wva-measurements-container-${this.props.orientation}`}>
                    <div className='wva-measurements-current-sel-list'>
                        <div className='wva-block-subcaption'>Current selection</div>
                        {this.selections()}
                    </div>
                    <div className='wva-spaced-flex-vertical'>
                        {<PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                            classNameDisabled='wva-pushbutton-disabled wva-pushbutton-border wva-padded-pushbutton'
                            text='Label'
                            onClick={() => this.addLabel()}
                            enabled={history.length > 0}
                        />}
                        {<PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                            classNameDisabled='wva-pushbutton-disabled wva-pushbutton-border wva-padded-pushbutton'
                            text='Distance'
                            onClick={() => this.measureDistance()}
                            enabled={history.length > 1}
                        />}
                        {<PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                            classNameDisabled='wva-pushbutton-disabled wva-pushbutton-border wva-padded-pushbutton'
                            text='Angle'
                            onClick={() => this.measureAngle()}
                            enabled={history.length > 2}
                        />}
                        {<PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                            classNameDisabled='wva-pushbutton-disabled wva-pushbutton-border wva-padded-pushbutton'
                            text='Dihedral'
                            onClick={() => this.measureDihedral()}
                            enabled={history.length > 3}
                        />}
                    </div>
                    <div className='wva-spaced-flex-vertical wva-vertically-scrollable' style={{ flex: 1 }}>
                        {this.measurements()}
                    </div>
                    <div className='wva-spaced-flex-vertical'>
                        <PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                            text='Remove all'
                            onClick={() => this.removeAll()}
                        />
                    </div>
                </div>
            </Collapsible>
        );
    }
}

export namespace Measurements {
    export interface Props {
        plugin?: PluginUIContext;
        orientation: 'vertical' | 'horizontal';
        pathPrefix: string;
    }

    export function clearSelection(plugin: PluginUIContext) {
        plugin.managers.structure.selection.clear();
    }

    export async function removeAllMeasurements(plugin: PluginUIContext) {
        const measurements = plugin.managers.structure.measurement.state;
        if (!measurements)
            return;

        let changed = false;
        for (const k of ['distances', 'angles', 'dihedrals'] as (keyof StructureMeasurementManagerState)[]) {
            for (const cell of measurements[k] as StructureMeasurementCell[]) {
                changed = true;
                await PluginCommands.State.RemoveObject(plugin, { state: cell.parent!, ref: cell.transform.parent, removeParentGhosts: true });
            }
        }

        if (changed)
            Util.triggerResize();
    }
}
