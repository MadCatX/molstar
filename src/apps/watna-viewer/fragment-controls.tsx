/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import { FragmentDescription as FD } from './fragment-description';
import { Resources } from './resources';
import * as ST from './substructure-types';
import { WatNAUtil } from './watna-util';
import { ColorPicker } from '../watlas-common/color-picker';
import { ComboBox } from '../watlas-common/combo-box';
import { PushButton } from '../watlas-common/push-button';
import { SpinBox } from '../watlas-common/spin-box';
import { Color } from '../../mol-util/color';

export type RepresentationControlsStyle = 'on-off' | 'options';
type ReprOption = { value: FD.StructureRepresentation | FD.OffRepresentation, caption: string };

const OffBallStickCartoonOpts: ReprOption[] = [
    { value: 'off', caption: 'Off' },
    { value: 'ball-and-stick', caption: 'Ball-and-stick' },
    { value: 'cartoon', caption: 'Cartoon' },
];

const OffBallStickOpts: ReprOption[] = [
    { value: 'off', caption: 'Off' },
    { value: 'ball-and-stick', caption: 'Ball-and-stick' },
];

const NonNucleic: ST.NonNucleicType[] = ['ligand', 'protein', 'water'];

export class FragmentControls extends React.Component<FragmentControls.Props, { expanded: boolean }> {
    constructor(props: FragmentControls.Props) {
        super(props);

        this.state = {
            expanded: true,
        };
    }

    private hasExtraStructureParts() {
        const substructs = Array.from(this.props.structures.get('reference')!.keys());
        for (const nn of NonNucleic) {
            if (substructs.includes(nn))
                return true;
        }
        return false;
    }

    private renderColorCodedCaption(caption: string, kind: Resources.AllKinds, substru: ST.SubstructureType) {
        const color = this.props.colors.get(kind)!.get(substru)!.color;
        const rgb = Color.toRgb(color);
        return (
            <div
                style={{ display: 'flex', alignItems: 'center' }}
                onClick={evt => {
                    ColorPicker.create(evt, color, clr => this.props.onChangeColor(clr, kind, substru));
                }}
            >
                <span>{caption}</span>
                <div className='wnav-ntc-color-box-inline' style={{ backgroundColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` }} />
            </div>
        );
    }

    private renderDensityMapControl(caption: string, kind: Resources.DensityMaps, substru: ST.SubstructureType) {
        const dm = this.props.densityMaps.get(kind)!;
        const bounds = WatNAUtil.isoBounds(dm.isoRange.min, dm.isoRange.max);
        const isoFixed = WatNAUtil.isoToFixed(dm.iso, bounds.step);
        return (
            <div className='wnav-ntc-fragment-densitymap'>
                <div className='wnav-ntc-fragment-densitymap-firstrow wnav-ctrl-item'>
                    {this.renderColorCodedCaption(`${caption} σ`, kind, substru)}
                    <ComboBox
                        options={[
                            { value: 'off', caption: 'Off' },
                            { value: 'solid', caption: 'Solid' },
                            { value: 'wireframe', caption: 'Wireframe' },
                            { value: 'both', caption: 'Both' }
                        ]}
                        value={dm.representation}
                        onChange={val => this.props.onChangeResourceRepresentation(val as FD.MapRepresentation, kind, 'density-map', 'water') }
                        pathPrefix={this.props.pathPrefix}
                    />
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

    private renderNonNucleicStructurePartsControls() {
        if (!this.hasExtraStructureParts())
            return undefined;

        return (
            <>
                <div className='wnav-block-subcaption wnav-centered-text'>{this.props.nonNucleicStructurePartsName}</div>
                {this.renderStructureControlRepresentations('Protein', 'reference', 'protein', OffBallStickCartoonOpts)}
                {this.renderStructureControlRepresentations('Ligand', 'reference', 'ligand', OffBallStickCartoonOpts)}
                {this.renderStructureControlRepresentations('Crystal waters', 'reference', 'water', OffBallStickOpts)}
            </>
        );
    }

    private renderStructureControlRepresentations(caption: string, kind: Resources.Structures, substru: ST.SubstructureType, options: { value: FD.StructureRepresentation | FD.OffRepresentation, caption: string }[]) {
        const stru = this.props.structures.get(kind)!.get(substru);
        if (!stru)
            return undefined;
        return (
            <div className='wnav-ctrl-line wnav-ctrl-item'>
                {this.renderColorCodedCaption(caption, kind, substru)}
                <ComboBox
                    options={options}
                    value={stru.representation}
                    onChange={val => this.props.onChangeResourceRepresentation(val as FD.StructureRepresentation, kind, 'structure', substru) }
                    pathPrefix={this.props.pathPrefix}
                />
            </div>
        );
    }

    private renderStructureControlOnOff(caption: string, kind: Resources.Structures, substru: ST.SubstructureType) {
        const stru = this.props.structures.get(kind)!.get(substru);
        if (!stru)
            return undefined;
        return (
            <div className='wnav-ctrl-line wnav-ctrl-item'>
                {this.renderColorCodedCaption(caption, kind, substru)}
                <div className='wva-vcenter-box'>
                    <input
                        className='wva-checkbox'
                        type='checkbox'
                        checked={stru.representation !== 'off'}
                        onChange={evt => this.props.onChangeResourceRepresentation(evt.currentTarget.checked ? 'ball-and-stick' : 'off', kind, 'structure', substru)}
                    />
                </div>
            </div>
        );
    }

    private renderStructureControl(caption: string, kind: Resources.Structures, substru: ST.SubstructureType, options: ReprOption[]) {
        if (this.props.representationControlsStyle === 'options')
            return this.renderStructureControlRepresentations(caption, kind, substru, options);
        return this.renderStructureControlOnOff(caption, kind, substru);
    }

    private renderControls() {
        return (
            <>
                <div className='wnav-ntc-fragment-structures-block'>
                    {this.props.nonNucleicStructurePartsPlacement === 'first' ? this.renderNonNucleicStructurePartsControls() : undefined}
                    {this.renderStructureControl(this.props.referenceName.text, 'reference', 'nucleic', OffBallStickCartoonOpts)}
                    <div className='wnav-block-subcaption wnav-centered-text'>{this.props.hydrationSitesName}</div>
                    {this.renderStructureControl('Base', 'base', 'water', OffBallStickOpts)}
                    {this.renderStructureControl('Backbone', 'phosphate', 'water', OffBallStickOpts)}
                    {this.props.showStepWaters ? this.renderStructureControl(this.props.nucleotideWatersName, 'nucleotide', 'water', OffBallStickOpts) : undefined}
                </div>
                <div className='wnav-ntc-fragment-densitymaps-block'>
                    <div className='wnav-block-subcaption wnav-centered-text'>{this.props.hydrationDistributionName}</div>
                    {this.renderDensityMapControl('Base', 'base', 'water')}
                    {this.renderDensityMapControl('Backbone', 'phosphate', 'water')}
                    {this.props.showStepWaters ? this.renderDensityMapControl(this.props.nucleotideWatersName, 'nucleotide', 'water') : undefined}
                </div>
                {this.props.nonNucleicStructurePartsPlacement === 'last' ? this.renderNonNucleicStructurePartsControls() : undefined}
            </>
        );
    }

    render() {
        const clr = this.props.colors.get('reference')!.get('nucleic')!.color;
        const rgbCss = (rgb => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`)(Color.toRgb(clr));
        return (
            <div className='wnav-ntc-fragment-container'>
                <div className='wnav-ntc-fragment-header'>
                    <div className='wnav-ntc-fragment-name'>{this.props.fragId}</div>
                    <div className='wnav-ntc-reference-color-box'
                        style={{
                            backgroundColor: rgbCss,
                            border: `0.15em solid ${rgbCss}`,
                        }}
                        onClick={evt => ColorPicker.create(evt, clr, clr => this.props.onChangeColor(clr, 'reference', 'nucleic'))}
                    />
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-symbolic-pushbutton'
                        onClick={() => this.setState({ ...this.state, expanded: !this.state.expanded })}
                    >
                        {this.state.expanded
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
                {this.state.expanded ? this.renderControls() : undefined}
            </div>
        );
    }
}

export namespace FragmentControls {
    export interface OnChangeColor {
        (clr: number, kind: Resources.AllKinds, substru: ST.SubstructureType): void;
    }

    export interface OnDensityMapIsoChanged {
        (iso: number, kind: Resources.DensityMaps): void;
    }

    export interface OnChangeResourceRepresentation {
        (repr: FD.StructureRepresentation | FD.MapRepresentation | FD.OffRepresentation, kind: Resources.AllKinds, type: Resources.Type, substru: ST.SubstructureType): void;
    }

    export interface OnRemoveClicked {
        (): void;
    }

    export interface Props extends FD.Description {
        representationControlsStyle: RepresentationControlsStyle;
        nonNucleicStructurePartsName: string;
        nonNucleicStructurePartsPlacement: 'first' | 'last';
        hydrationSitesName: string;
        hydrationDistributionName: string;
        nucleotideWatersName: string;
        referenceName: { text: string; transform: boolean };
        showStepWaters: boolean;
        onChangeColor: OnChangeColor;
        onChangeResourceRepresentation: OnChangeResourceRepresentation;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onRemoveClicked: OnRemoveClicked;
        pathPrefix: string;
    }
}
