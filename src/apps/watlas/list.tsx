/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import * as React from 'react';
import { NtCFragment } from './ntc-fragment';
import { NtCDescription } from './ntc-description';
import { Resources } from './resources';

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
            <div className='ntc-fragments-list'>
                {Array.from(this.props.fragments.entries()).sort((a, b) => cmpStr(a[0], b[0])).map(([base, v]) => {
                    const expanded = this.state.fragmentsState.get(base) ?? true;
                    const props: NtCFragment.Props = {
                        ...v,
                        expanded,
                        showStepWaters: this.props.showStepWaters,
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
                    };
                    return (
                        <NtCFragment {...props} key={base} />
                    );
                })}
            </div>
        );
    }
}

export namespace List {
    export interface OnDensityMapIsoChanged {
        (iso: number, kind: Resources.DensityMaps, base: string): void;
    }

    export interface OnDensityMapStyleChanged {
        (style: NtCDescription.MapStyle, kind: Resources.DensityMaps, base: string): void;
    }

    export interface OnHideShowResource {
        (show: boolean, kind: Resources.AllKinds, type: Resources.Type, base: string): void;
    }

    export interface Props {
        fragments: Map<string, NtCDescription.Description>;
        showStepWaters: boolean;
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onDensityMapStyleChanged: OnDensityMapStyleChanged;
        onHideShowResource: OnHideShowResource;
    }
}
