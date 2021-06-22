/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import * as React from 'react';
import { PushButton } from './push-button';
import { Resources }  from './resources';
import { Util } from './util';
import { NtCDescription } from './ntc-description';
import { Color } from '../../mol-util/color';

export class NtCFragment extends React.Component<NtCFragment.Props> {
    private renderDensityMapControl(caption: string, kind: Resources.DensityMaps ) {
        const dm = this.props.densityMaps.get(kind)!;
        const bounds = Util.isoBounds(dm.isoRange.min, dm.isoRange.max);
        return (
            <div className='ntc-fragment-densitymap'>
                <div className='ntc-fragment-densitymap-firstrow watlas-wapp-ctrl-item'>
                    <div>{caption} σ</div>
                    <select
                        value={dm.style}
                        onChange={evt => this.props.onDensityMapStyleChanged(evt.target.value as NtCDescription.MapStyle, kind)}
                    >
                        <option value='solid'>Solid</option>
                        <option value='wireframe'>Wireframe</option>
                        <option value='both'>Both</option>
                    </select>
                    <input
                        type='checkbox'
                        checked={dm.shown}
                        onChange={evt => this.props.onHideShowResource(evt.target.checked, kind, 'density-map')}
                    />
                </div>
                <div className='ntc-fragment-densitymap-secondrow watlas-wapp-ctrl-item'>
                    <input
                        type='range'
                        value={dm.iso}
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        onChange={evt => this.props.onDensityMapIsoChanged(parseFloat(evt.target.value), kind)}
                    />
                    <input
                        type='number'
                        value={dm.iso}
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
            <div className='watlas-wapp-ctrl-line watlas-wapp-ctrl-item'>
                <div>{caption}</div>
                <input
                    type='checkbox'
                    checked={stru.shown}
                    onChange={evt => this.props.onHideShowResource(evt.target.checked, kind, 'structure')}
                />
            </div>
        );
    }

    private renderControls() {
        return (
            <>
                <div className='ntc-fragment-structures-block'>
                    {this.renderStructureControl('Reference', 'reference')}
                    {this.renderStructureControl('Base waters', 'base')}
                    {this.renderStructureControl('Phosphate waters', 'phos')}
                    {this.props.showStepWaters ? this.renderStructureControl('Step waters', 'step') : undefined}
                </div>
                <div className='ntc-fragment-densitymaps-block'>
                    {this.renderDensityMapControl('Base waters', 'base')}
                    {this.renderDensityMapControl('Phosphate waters', 'phos')}
                    {this.props.showStepWaters ? this.renderDensityMapControl('Step waters', 'step') : undefined}
                </div>
            </>
        );
    }

    render() {
        return (
            <div className='ntc-fragment-container'>
                <div className='ntc-fragment-header'>
                    <div className='ntc-fragment-name'>{this.props.ntc} {this.props.seq}</div>
                    <div className='ntc-color-box' style={{background: Color.toStyle(this.props.colors.get('base')!)}}>B</div>
                    <div className='ntc-color-box' style={{background: Color.toStyle(this.props.colors.get('phos')!)}}>P</div>
                    <div className='ntc-color-spacer'></div>
                    {
                        this.props.showStepWaters
                        ?
                            <>
                                <div className='ntc-color-box' style={{background: Color.toStyle(this.props.colors.get('step')!)}}>S</div>
                                <div className='ntc-color-spacer'></div>
                            </>
                        :
                            undefined
                    }
                    <PushButton
                        className='hideshow-pushbutton pushbutton-common pushbutton-default pushbutton-clr-default pushbutton-hclr-default'
                        value={this.props.expanded ? 'Hide ▼' : 'Show ▲'}
                        onClick={() => this.props.onHideShowClicked()}
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

    export interface Props extends NtCDescription.Description {
        expanded: boolean;
        showStepWaters: boolean;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onDensityMapStyleChanged: OnDensityMapStyleChanged;
        onHideShowClicked: OnHideShowClicked;
        onHideShowResource: OnHideShowResource;
    }
}
