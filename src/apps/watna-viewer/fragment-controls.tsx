/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import { Coloring } from './coloring';
import { FragmentDescription } from './fragment-description';
import { Resources } from './resources';
import * as ST from './substructure-types';
import { WatNAUtil } from './watna-util';
import { ColorPicker } from '../watlas-common/color-picker';
import { ComboBox } from '../watlas-common/combo-box';
import { PushButton } from '../watlas-common/push-button';
import { SpinBox } from '../watlas-common/spin-box';
import { Tooltip } from '../watlas-common/tooltip';
import { Color } from '../../mol-util/color';

function colorBoxStyle(color: Color) {
    const lum = Coloring.luminance(color);
    const fg = lum < 0.57 ? 'white' : 'black';
    const bg = Color.toStyle(color);

    return { background: bg, color: fg };
}

export class FragmentControls extends React.Component<FragmentControls.Props> {
    private hasExtraStructureParts() {
        return this.props.extraStructurePartsRepresentations.get('protein') !== null ||
               this.props.extraStructurePartsRepresentations.get('water') !== null ||
               this.props.extraStructurePartsRepresentations.get('ligand') !== null ||
               this.props.treatReferenceAsExtraPart;
    }

    private hideShowAllResources(show: boolean) {
        const resources: Resources.AllKinds[] = ['base', 'phosphate'];
        if (this.props.showStepWaters)
            resources.push('nucleotide');

        for (const r of resources)
            this.props.onHideShowResource(show, r, 'density-map');

        resources.push('reference');
        for (const r of resources)
            this.props.onHideShowResource(show, r, 'structure');
    }

    private renderColorCodedCaptionRaw(caption: string, color: Color) {
        const rgb = Color.toRgb(color);
        return (
            <div style={{ display: 'flex', alignItems: 'center' }} >
                <span>{caption}</span>
                <div className='wva-ntc-color-box-inline' style={{ backgroundColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` }} />
            </div>
        );
    }

    private renderColorCodedCaption(caption: string, kind: Resources.AllKinds) {
        return this.renderColorCodedCaptionRaw(caption, this.props.colors.get(kind)!);
    }

    private renderDensityMapControl(caption: string, kind: Resources.DensityMaps) {
        const dm = this.props.densityMaps.get(kind)!;
        const bounds = WatNAUtil.isoBounds(dm.isoRange.min, dm.isoRange.max);
        const isoFixed = WatNAUtil.isoToFixed(dm.iso, bounds.step);
        return (
            <div className='wnav-ntc-fragment-densitymap'>
                <div className='wnav-ntc-fragment-densitymap-firstrow wnav-ctrl-item'>
                    {this.renderColorCodedCaption(`${caption} σ`, kind)}
                    <ComboBox
                        options={[
                            { value: 'solid', caption: 'Solid' },
                            { value: 'wireframe', caption: 'Wireframe' },
                            { value: 'both', caption: 'Both' }
                        ]}
                        value={dm.style}
                        onChange={val => this.props.onDensityMapStyleChanged(val as FragmentDescription.MapStyle, kind)}
                        pathPrefix={this.props.pathPrefix}
                    />
                    <div className='wva-vcenter-box'>
                        <input
                            className='wva-checkbox'
                            type='checkbox'
                            checked={dm.shown}
                            onChange={evt => this.props.onHideShowResource(evt.target.checked, kind, 'density-map')}
                        />
                    </div>
                </div>
                <div className='wnav-ntc-fragment-densitymap-secondrow wnav-ctrl-item'>
                    <input
                        className='wva-range-slider'
                        type='range'
                        value={isoFixed}
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        onChange={evt => this.props.onDensityMapIsoChanged(parseFloat(evt.target.value), kind)}
                    />
                    <SpinBox
                        value={dm.iso}
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        onChange={v => this.props.onDensityMapIsoChanged(parseFloat(v), kind)}
                        formatter={v => WatNAUtil.isoToFixed(v, bounds.step)}
                    />
                </div>
            </div>
        );
    }

    private renderStructureControl(caption: string, kind: Resources.Structures) {
        const stru = this.props.structures.get(kind)!;
        return (
            <div className='wnav-ctrl-line wnav-ctrl-item'>
                {this.renderColorCodedCaption(caption, kind)}
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

    private renderExtraStructurePartsControls() {
        if (!this.hasExtraStructureParts())
            return undefined;

        return (
            <>
                <div className='wnav-block-subcaption wnav-centered-text'>{this.props.extraStructurePartsName}</div>
                {this.props.treatReferenceAsExtraPart ?
                    <div className='wnav-ctrl-line wnav-ctrl-item'>
                        {this.renderColorCodedCaption(this.props.referenceName.text, 'reference')}
                        <ComboBox
                            value={this.props.structures.get('reference')!.shown ? 'ball-and-stick' : 'off'}
                            onChange={value => this.props.onHideShowResource(value === 'ball-and-stick', 'reference', 'structure')}
                            options={[
                                { value: 'off', caption: 'Off' },
                                { value: 'ball-and-stick', caption: 'Ball-and-stick' }
                            ]}
                            pathPrefix={this.props.pathPrefix}
                        />
                    </div>
                    :
                    undefined
                }
                {this.props.extraStructurePartsRepresentations.get('protein') !== null ?
                    <div className='wnav-ctrl-line wnav-ctrl-item'>
                        {this.renderColorCodedCaptionRaw('Protein', Coloring.nonNucleicColor('protein', this.props.colors.get('reference')!))}
                        <ComboBox
                            value={this.props.extraStructurePartsRepresentations.get('protein')!}
                            onChange={value => this.props.onChangeNonNucleicAppearance(value as ST.SubstructureRepresentation, 'protein')}
                            options={[
                                { value: 'off', caption: 'Off' },
                                { value: 'cartoon', caption: 'Cartoon' },
                                { value: 'ball-and-stick', caption: 'Ball-and-stick' }
                            ]}
                            pathPrefix={this.props.pathPrefix}
                        />
                    </div>
                    :
                    undefined
                }
                {this.props.extraStructurePartsRepresentations.get('ligand') !== null ?
                    <div className='wnav-ctrl-line wnav-ctrl-item'>
                        {this.renderColorCodedCaption('Ligands', 'reference')}
                        <ComboBox
                            value={this.props.extraStructurePartsRepresentations.get('ligand')!}
                            onChange={value => this.props.onChangeNonNucleicAppearance(value as ST.SubstructureRepresentation, 'ligand')}
                            options={[
                                { value: 'off', caption: 'Off' },
                                { value: 'ball-and-stick', caption: 'Ball-and-stick' }
                            ]}
                            pathPrefix={this.props.pathPrefix}
                        />
                    </div>
                    :
                    undefined
                }
                {this.props.extraStructurePartsRepresentations.get('water') !== null ?
                    <div className='wnav-ctrl-line wnav-ctrl-item'>
                        {this.renderColorCodedCaptionRaw('Crystal waters', Coloring.nonNucleicColor('water', this.props.colors.get('reference')!))}
                        <ComboBox
                            value={this.props.extraStructurePartsRepresentations.get('water')!}
                            onChange={value => this.props.onChangeNonNucleicAppearance(value as ST.SubstructureRepresentation, 'water')}
                            options={[
                                { value: 'off', caption: 'Off' },
                                { value: 'ball-and-stick', caption: 'Ball-and-stick' }
                            ]}
                            pathPrefix={this.props.pathPrefix}
                        />
                    </div>
                    :
                    undefined
                }
            </>
        );
    }

    private renderControls() {
        return (
            <>
                <div className='wnav-ntc-fragment-hide-show-btns'>
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border'
                        text='Show all'
                        onClick={() => this.hideShowAllResources(true)}
                    />
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border'
                        text='Hide all'
                        onClick={() => this.hideShowAllResources(false)}
                    />
                    <div></div>
                </div>
                <div className='wnav-ntc-fragment-structures-block'>
                    {this.props.extraStructurePartsPlacement === 'first' ? this.renderExtraStructurePartsControls() : undefined}
                    {this.props.treatReferenceAsExtraPart
                        ?
                        undefined
                        :
                        this.renderStructureControl(this.props.referenceName.text, 'reference')
                    }
                    <div className='wnav-block-subcaption wnav-centered-text'>{this.props.hydrationSitesName}</div>
                    {this.renderStructureControl('Base', 'base')}
                    {this.renderStructureControl('Backbone', 'phosphate')}
                    {this.props.showStepWaters ? this.renderStructureControl(this.props.nucleotideWatersName, 'nucleotide') : undefined}
                </div>
                <div className='wnav-ntc-fragment-densitymaps-block'>
                    <div className='wnav-block-subcaption wnav-centered-text'>{this.props.hydrationDistributionName}</div>
                    {this.renderDensityMapControl('Base', 'base')}
                    {this.renderDensityMapControl('Backbone', 'phosphate')}
                    {this.props.showStepWaters ? this.renderDensityMapControl(this.props.nucleotideWatersName, 'nucleotide') : undefined}
                </div>
                {this.props.extraStructurePartsPlacement === 'last' ? this.renderExtraStructurePartsControls() : undefined}
            </>
        );
    }

    render() {
        return (
            <div className='wnav-ntc-fragment-container'>
                <div className='wnav-ntc-fragment-header'>
                    <div className='wnav-ntc-fragment-name'>{this.props.fragId}</div>
                    <Tooltip
                        text={`Color of ${this.props.referenceName.transform ? this.props.referenceName.text.toLowerCase() : this.props.referenceName.text}/base waters`}
                        leftOffset='0px' topOffset='2em'
                    >
                        <div
                            className='wnav-ntc-color-box'
                            style={colorBoxStyle(this.props.colors.get('base')!)}
                            onClick={evt => ColorPicker.create(evt, this.props.colors.get('base')!, clr => this.props.onChangeColor(clr, 'base'))}
                        >
                            {'\u00A0'}
                        </div>
                    </Tooltip>
                    <Tooltip text='Color of backbone waters' leftOffset='0px' topOffset='2em'>
                        <div
                            className='wnav-ntc-color-box'
                            style={colorBoxStyle(this.props.colors.get('phosphate')!)}
                            onClick={evt => ColorPicker.create(evt, this.props.colors.get('phosphate')!, clr => this.props.onChangeColor(clr, 'phosphate'))}
                        >
                            {'\u00A0'}
                        </div>
                    </Tooltip>
                    <div className='wnav-ntc-color-spacer'></div>
                    {
                        this.props.showStepWaters
                            ?
                            <>
                                <Tooltip text={`Color of ${this.props.nucleotideWatersName.toLowerCase()}`} leftOffset='0px' topOffset='2em'>
                                    <div
                                        className='wva-ntc-color-box'
                                        style={colorBoxStyle(this.props.colors.get('nucleotide')!)}
                                        onClick={evt => ColorPicker.create(evt, this.props.colors.get('nucleotide')!, clr => this.props.onChangeColor(clr, 'nucleotide'))}
                                    >
                                        {'\u00A0'}
                                    </div>
                                </Tooltip>
                                <div className='wnav-ntc-color-spacer'></div>
                            </>
                            :
                            undefined
                    }
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-symbolic-pushbutton'
                        onClick={() => this.props.onHideShowClicked()}
                    >
                        {this.props.expanded
                            ? <img src={`${this.props.pathPrefix}assets/imgs/triangle-down.svg`} />
                            : <img src={`${this.props.pathPrefix}assets/imgs/triangle-up.svg`} />
                        }
                    </PushButton>
                    <div className='wnav-ntc-color-spacer'></div>
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-symbolic-pushbutton'
                        onClick={() => this.props.onRemoveClicked()}
                    >
                        <img src={`${this.props.pathPrefix}assets/imgs/x-red.svg`} />
                    </PushButton>
                </div>
                {this.props.expanded ? this.renderControls() : undefined}
            </div>
        );
    }
}

export namespace FragmentControls {
    export interface OnChangeColor {
        (clr: number, kind: Resources.AllKinds): void;
    }

    export interface OnChangeNonNucleicAppearance {
        (repr: ST.SubstructureRepresentation, type: ST.NonNucleicType): void;
    }

    export interface OnDensityMapIsoChanged {
        (iso: number, kind: Resources.DensityMaps): void;
    }

    export interface OnDensityMapStyleChanged {
        (style: FragmentDescription.MapStyle, kind: Resources.DensityMaps): void;
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

    export interface Props extends FragmentDescription.Description {
        expanded: boolean;
        extraStructurePartsName: string;
        extraStructurePartsPlacement: 'first' | 'last';
        hydrationSitesName: string;
        hydrationDistributionName: string;
        nucleotideWatersName: string;
        referenceName: { text: string; transform: boolean };
        showStepWaters: boolean;
        treatReferenceAsExtraPart: boolean;
        onChangeColor: OnChangeColor;
        onChangeNonNucleicAppearance: OnChangeNonNucleicAppearance;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onDensityMapStyleChanged: OnDensityMapStyleChanged;
        onHideShowClicked: OnHideShowClicked;
        onHideShowResource: OnHideShowResource;
        onRemoveClicked: OnRemoveClicked;
        pathPrefix: string;
    }
}
