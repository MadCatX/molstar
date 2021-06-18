/**
 */

import * as React from 'react';
import { NtCFragment } from './ntc-fragment';
import { NtCDescription } from './ntc-description';
import { Resources } from './resources';

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
                {Array.from(this.props.fragments.entries()).map(([base, v]) => {
                    const expanded = this.state.fragmentsState.get(base) ?? true;
                    const props: NtCFragment.Props = {
                        ...v,
                        expanded,
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
        onDensityMapIsoChanged: OnDensityMapIsoChanged;
        onDensityMapStyleChanged: OnDensityMapStyleChanged;
        onHideShowResource: OnHideShowResource;
    }
}
