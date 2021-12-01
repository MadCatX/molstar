import * as React from 'react';

import { PushButton } from './push-button';

interface State {
    isCollapsed: boolean;
}

export class Collapsible extends React.Component<Collapsible.Props, State> {
    constructor(props: Collapsible.Props) {
        super(props);

        this.state = {
            isCollapsed: this.props.initialState === 'collapsed',
        };
    }

    private dontGrow() {
        return this.props.dontGrow ? 'wva-dont-grow' : '';
    }

    render() {
        if (this.state.isCollapsed) {
            if (this.props.orientation === 'vertical') {
                return (
                    <div className='wva-collapsed-ctrl-header-vertical'>
                        <PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton wva-colapse-expand-pushbutton'
                            value='▼'
                            onClick={
                                () => {
                                    this.setState({ ...this.state, isCollapsed: false });
                                    if (this.props.onStateChanged) this.props.onStateChanged(false);
                                }
                            }
                        />
                        <div className='wva-block-caption wva-vertical'>{this.props.caption}</div>
                    </div>
                );
            } else {
                return (
                    <div className='wva-collapsed-ctrl-header-horizontal'>
                        <div className='wva-block-caption'>{this.props.caption}</div>
                        <PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton wva-colapse-expand-pushbutton'
                            value='▼'
                            onClick={
                                () => {
                                    this.setState({ ...this.state, isCollapsed: false });
                                    if (this.props.onStateChanged) this.props.onStateChanged(false);
                                }
                            }
                        />
                    </div>
                );
            }
        } else {
            return (
                <div className={'wva-expanded-ctrl ' + this.dontGrow()}>
                    <div className='wva-expanded-ctrl-header'>
                        <div className='wva-block-caption'>{this.props.caption}</div>
                        <PushButton
                            className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton wva-colapse-expand-pushbutton'
                            value='◀'
                            onClick={
                                () => {
                                    this.setState({ ...this.state, isCollapsed: true });
                                    if (this.props.onStateChanged) this.props.onStateChanged(true);
                                }
                            }
                        />
                    </div>
                    <div className={this.dontGrow()}>
                        {this.props.children}
                    </div>
                </div>
            );
        }
    }
}

export namespace Collapsible {
    export interface OnStateChanged {
        (isCollapsed: boolean): void;
    }

    export interface Props {
        caption: string;
        dontGrow?: boolean;
        initialState: 'expanded' | 'collapsed';
        orientation: 'horizontal' | 'vertical';
        onStateChanged?: OnStateChanged;
    }
}
