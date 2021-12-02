/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import { FragmentControls } from './fragment-controls';
import { FragmentDescription } from './fragment-description';
import { Resources } from './resources';
import * as ST from './substructure-types';

function cmpStr(s1: string, s2: string) {
    const r = s1 < s2;
    return (!r ? 1 : 0) - (r ? 1 : 0);
}

interface State {
    fragmentsState: Map<string, boolean>;
}

export class List extends React.Component<List.Props, State> {
    constructor(props: List.Props) {
        super(props);

        this.state = {
            fragmentsState: new Map(),
        };
    }

    render() {
        return (
            <div className='wnav-ntc-fragments-list'>
                {Array.from(this.props.fragments.entries()).sort((a, b) => cmpStr(a[0], b[0])).map(([base, v]) => {
                    const expanded = this.state.fragmentsState.get(base) ?? true;
                    const props: FragmentControls.Props = {
                        ...v,
                        expanded,
                        extraStructurePartsName: this.props.extraStructurePartsName,
                        extraStructurePartsPlacement: this.props.extraStructurePartsPlacement,
                        hydrationSitesName: this.props.hydrationSitesName,
                        hydrationDistributionName: this.props.hydrationDistributionName,
                        nucleotideWatersName: this.props.nucleotideWatersName,
                        showStepWaters: this.props.showStepWaters,
                        treatReferenceAsExtraPart: this.props.treatReferenceAsExtraPart,
                        onChangeColor: (clr, kind) => this.props.onChangeColor(clr, kind, base),
                        onChangeNonNucleicAppearance: (repr, type) => this.props.onChangeNonNucleicAppearance(repr, type, base),
                        onDensityMapIsoChanged: (iso, kind) => this.props.onDensityMapIsoChanged(iso, kind, base),
                        onDensityMapStyleChanged: (style, kind) => this.props.onDensityMapStyleChanged(style, kind, base),
                        onHideShowResource: (show, kind, type) => this.props.onHideShowResource(show, kind, type, base),
                        onHideShowClicked: () => {
                            const curr = this.state.fragmentsState.get(base) ?? true;
                            const newFragState = new Map(this.state.fragmentsState);
                            newFragState.set(base, !curr);

                            this.setState(
                                {
                                    ...this.state,
                                    fragmentsState: newFragState,
                                }
                            );
                        },
                        onRemoveClicked: () => this.props.onRemoveClicked(base),
                        pathPrefix: this.props.pathPrefix,
                    };
                    return (
                        <FragmentControls {...props} key={base} />
                    );
                })}
            </div>
        );
    }
}

export namespace List {
    export interface OnChangeColor {
        (clr: number, kind: Resources.AllKinds, base: string): void;
    }

    export interface OnChangeNonNucleicAppearance {
        (repr: ST.SubstructureRepresentation, type: ST.NonNucleicType, base: string): void;
    }

    export interface OnDensityMapIsoChanged {
        (iso: number, kind: Resources.DensityMaps, base: string): void;
    }

    export interface OnDensityMapStyleChanged {
        (style: FragmentDescription.MapStyle, kind: Resources.DensityMaps, base: string): void;
    }

    export interface OnHideShowResource {
        (show: boolean, kind: Resources.AllKinds, type: Resources.Type, base: string): void;
    }

    export interface OnRemoveClicked {
        (base: string): void;
    }

    export interface Props {
        fragments: Map<string, FragmentDescription.Description>;
        extraStructurePartsName: string;
        extraStructurePartsPlacement: 'first' | 'last';
        hydrationSitesName: string;
        hydrationDistributionName: string;
        nucleotideWatersName: string;
        showStepWaters: boolean;
        treatReferenceAsExtraPart: boolean;
        onChangeColor: OnChangeColor;
        onChangeNonNucleicAppearance: OnChangeNonNucleicAppearance;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onDensityMapStyleChanged: OnDensityMapStyleChanged;
        onHideShowResource: OnHideShowResource;
        onRemoveClicked: OnRemoveClicked;
        pathPrefix: string;
    }
}
