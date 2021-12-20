/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import { FragmentControls, RepresentationControlsStyle } from './fragment-controls';
import { FragmentDescription as FD } from './fragment-description';
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
                    const props: FragmentControls.Props = {
                        ...v,
                        nonNucleicStructurePartsName: this.props.nonNucleicStructurePartsName,
                        nonNucleicStructurePartsPlacement: this.props.nonNucleicStructurePartsPlacement,
                        hydrationSitesName: this.props.hydrationSitesName,
                        hydrationDistributionName: this.props.hydrationDistributionName,
                        nucleotideWatersName: this.props.nucleotideWatersName,
                        showStepWaters: this.props.showStepWaters,
                        onChangeColor: (clr, kind, substru) => this.props.onChangeColor(clr, kind, substru, base),
                        onChangeResourceRepresentation: (repr, kind, type, substru) => this.props.onChangeResourceRepresentation(repr, kind, type, substru, base),
                        onDensityMapIsoChanged: (iso, kind) => this.props.onDensityMapIsoChanged(iso, kind, base),
                        onRemoveClicked: () => this.props.onRemoveClicked(base),
                        pathPrefix: this.props.pathPrefix,
                        representationControlsStyle: this.props.representationControlsStyle,
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
        (clr: number, kind: Resources.AllKinds, substru: ST.SubstructureType, base: string): void;
    }

    export interface OnChangeResourceRepresentation {
        (repr: FD.StructureRepresentation | FD.MapRepresentation | FD.OffRepresentation, kind: Resources.AllKinds, type: Resources.Type, substru: ST.SubstructureType, base: string): void;
    }

    export interface OnDensityMapIsoChanged {
        (iso: number, kind: Resources.DensityMaps, base: string): void;
    }

    export interface OnRemoveClicked {
        (base: string): void;
    }

    export interface Props {
        fragments: Map<string, FD.Description>;
        nonNucleicStructurePartsName: string;
        nonNucleicStructurePartsPlacement: 'first' | 'last';
        hydrationSitesName: string;
        hydrationDistributionName: string;
        nucleotideWatersName: string;
        showStepWaters: boolean;
        onChangeColor: OnChangeColor;
        onChangeResourceRepresentation: OnChangeResourceRepresentation;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onRemoveClicked: OnRemoveClicked;
        pathPrefix: string;
        representationControlsStyle: RepresentationControlsStyle;
    }
}
