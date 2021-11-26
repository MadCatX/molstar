/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';

interface State {
    tooltipShown: boolean;
}

export class Tooltip extends React.Component<Tooltip.Props, State> {
    constructor(props: Tooltip.Props) {
        super(props);

        this.state = {
            tooltipShown: false,
        };
    }

    render() {
        return (
            <div className='wva-tooltip'
                onMouseEnter={() => this.setState({ ...this.state, tooltipShown: true })}
                onMouseLeave={() => this.setState({ ...this.state, tooltipShown: false })}
            >
                {this.state.tooltipShown ? <div className='wva-tooltip-text'>{this.props.text}</div> : undefined}
                {this.props.children}
            </div>
        );
    }
}

export namespace Tooltip {
    export interface Props {
        text: string;
    }
}


