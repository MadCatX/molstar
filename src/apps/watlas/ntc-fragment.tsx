/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import * as React from 'react';
import { Coloring } from './coloring';
import { PushButton } from './push-button';
import { Resources }  from './resources';
import { Util } from './util';
import { NtCDescription } from './ntc-description';
import { Color } from '../../mol-util/color';

function colorBoxStyle(color: Color) {
    const lum = Coloring.luminance(color);
    const fg = lum < 0.57 ? 'white' : 'black';
    const bg = Color.toStyle(color);

    return { background: bg, color: fg };
}

export class NtCFragment extends React.Component<NtCFragment.Props> {
    private hideShowAllResources(show: boolean) {
        const resources: Resources.AllKinds[] = [ 'base', 'phos' ];
        if (this.props.showStepWaters)
            resources.push('step');

        for (const r of resources)
            this.props.onHideShowResource(show, r, 'density-map');

        resources.push('reference');
        for (const r of resources)
            this.props.onHideShowResource(show, r, 'structure');
    }

    private renderDensityMapControl(caption: string, kind: Resources.DensityMaps ) {
        const dm = this.props.densityMaps.get(kind)!;
        const bounds = Util.isoBounds(dm.isoRange.min, dm.isoRange.max);
        const isoFixed = Util.isoToFixed(dm.iso, bounds.step);
        return (
            <div className='wva-ntc-fragment-densitymap'>
                <div className='wva-ntc-fragment-densitymap-firstrow wva-ctrl-item'>
                    <div>{caption} σ</div>
                    <div className='wva-select-wrapper'>
                        <select
                            className='wva-select'
                            value={dm.style}
                            onChange={evt => this.props.onDensityMapStyleChanged(evt.target.value as NtCDescription.MapStyle, kind)}
                        >
                            <option value='solid'>Solid</option>
                            <option value='wireframe'>Wireframe</option>
                            <option value='both'>Both</option>
                        </select>
                    </div>
                    <div className='wva-vcenter-box'>
                        <input
                            className='wva-checkbox'
                            type='checkbox'
                            checked={dm.shown}
                            onChange={evt => this.props.onHideShowResource(evt.target.checked, kind, 'density-map')}
                        />
                    </div>
                </div>
                <div className='wva-ntc-fragment-densitymap-secondrow wva-ctrl-item'>
                    <input
                        className='wva-range-slider'
                        type='range'
                        value={isoFixed}
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        onChange={evt => this.props.onDensityMapIsoChanged(parseFloat(evt.target.value), kind)}
                    />
                    <input
                        className='wva-spinbox'
                        type='number'
                        value={isoFixed}
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        onChange={evt => this.props.onDensityMapIsoChanged(parseFloat(evt.target.value), kind)}
                    />
                </div>
            </div>
        );
    }

    private renderStructureControl(caption: string, kind: Resources.Structures) {
        const stru = this.props.structures.get(kind)!;
        return (
            <div className='wva-ctrl-line wva-ctrl-item'>
                <div>{caption}</div>
                <div className='wva-vcenter-box'>
                    <input
                        className='wva-checkbox'
                        type='checkbox'
                        checked={stru.shown}
                        onChange={evt => this.props.onHideShowResource(evt.target.checked, kind, 'structure')}
                    />
                </div>
            </div>
        );
    }

    private renderControls() {
        return (
            <>
                <div className='wva-ntc-fragment-hide-show-btns'>
                    <PushButton
                        className='wva-pushbutton'
                        value='Show all'
                        onClick={() => this.hideShowAllResources(true)}
                    />
                    <PushButton
                        className='wva-pushbutton'
                        value='Hide all'
                        onClick={() => this.hideShowAllResources(false)}
                    />
                    <div></div>
                </div>
                <div className='wva-ntc-fragment-structures-block'>
                    {this.renderStructureControl('Reference', 'reference')}
                    {this.renderStructureControl('Base waters', 'base')}
                    {this.renderStructureControl('Phosphate waters', 'phos')}
                    {this.props.showStepWaters ? this.renderStructureControl('Step waters', 'step') : undefined}
                </div>
                <div className='wva-ntc-fragment-densitymaps-block'>
                    {this.renderDensityMapControl('Base waters', 'base')}
                    {this.renderDensityMapControl('Phosphate waters', 'phos')}
                    {this.props.showStepWaters ? this.renderDensityMapControl('Step waters', 'step') : undefined}
                </div>
            </>
        );
    }

    render() {
        return (
            <div className='wva-ntc-fragment-container'>
                <div className='wva-ntc-fragment-header'>
                    <div className='wva-ntc-fragment-name'>{this.props.ntc} {this.props.seq}</div>
                    <div className='wva-ntc-color-box' style={colorBoxStyle(this.props.colors.get('base')!)}>B</div>
                    <div className='wva-ntc-color-box' style={colorBoxStyle(this.props.colors.get('phos')!)}>P</div>
                    <div className='wva-ntc-color-spacer'></div>
                    {
                        this.props.showStepWaters
                        ?
                            <>
                                <div className='wva-ntc-color-box' style={colorBoxStyle(this.props.colors.get('step')!)}>S</div>
                                <div className='wva-ntc-color-spacer'></div>
                            </>
                        :
                            undefined
                    }
                    <PushButton
                        className='wva-pushbutton wva-hideshow-pushbutton'
                        value={this.props.expanded ? '▼' : '▲'}
                        onClick={() => this.props.onHideShowClicked()}
                    />
                    <div className='wva-ntc-color-spacer'></div>
                    <PushButton
                        className='wva-pushbutton wva-remove-fragment-pushbutton'
                        value='❌'
                        onClick={() => this.props.onRemoveClicked()}
                    />
                </div>
                {this.props.expanded ? this.renderControls() : undefined}
            </div>
        );
    }
}

export namespace NtCFragment {
    export interface OnDensityMapIsoChanged {
        (iso: number, kind: Resources.DensityMaps): void;
    }

    export interface OnDensityMapStyleChanged {
        (style: NtCDescription.MapStyle, kind: Resources.DensityMaps): void;
    }

    export interface OnHideShowClicked {
        (): void;
    }

    export interface OnHideShowResource {
        (show: boolean, kind: Resources.AllKinds, type: Resources.Type): void;
    }

    export interface OnRemoveClicked {
        (): void;
    }

    export interface Props extends NtCDescription.Description {
        expanded: boolean;
        showStepWaters: boolean;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onDensityMapStyleChanged: OnDensityMapStyleChanged;
        onHideShowClicked: OnHideShowClicked;
        onHideShowResource: OnHideShowResource;
        onRemoveClicked: OnRemoveClicked;
    }
}
