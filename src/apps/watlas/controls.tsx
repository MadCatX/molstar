/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 */

import * as React from 'react';

export class Controls extends React.Component<Controls.Props> {
    render() {
        return (
            <div className='wva-ctrls'>
                <div className='wva-ctrl-line wva-ctrl-item'>
                    <div>Show step waters</div>
                    <div className='wva-vcenter-box'>
                        <input
                            className='wva-checkbox'
                            type='checkbox'
                            checked={this.props.showStepWaters}
                            onChange={evt => this.props.onHideShowStepWaters(evt.currentTarget.checked)}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export namespace Controls {
    export interface OnHideShowStepWaters {
        (show: boolean): void;
    }

    export interface Props {
        showStepWaters: boolean;
        onHideShowStepWaters: OnHideShowStepWaters;
    }
}
