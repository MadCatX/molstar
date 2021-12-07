/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { UUID } from '../../mol-util/uuid';

class TooltipContent extends React.Component<{ text: string; leftOffset: string; topOffset: string }> {
    render() {
        return (
            <div
                className='wva-tooltip-text'
                style={{
                    position: 'absolute',
                    left: this.props.leftOffset,
                    top: this.props.topOffset,
                }}
            >
                {this.props.text}
            </div>
        );
    }
}

export class Tooltip extends React.Component<Tooltip.Props> {
    private contentId;

    constructor(props: Tooltip.Props) {
        super(props);

        this.contentId = UUID.create22();

        this.state = {
            tooltipShown: false,
        };
    }

    render() {
        return (
            <div
                onMouseEnter={evt => {
                    const tainer = document.createElement('div');
                    tainer.id = this.contentId;
                    tainer.style.position = 'absolute';
                    tainer.style.top = `${evt.pageY}px`;
                    tainer.style.left = `${evt.pageX}px`;

                    ReactDOM.render(
                        <TooltipContent
                            text={this.props.text}
                            leftOffset={this.props.leftOffset}
                            topOffset={this.props.topOffset}
                        />,
                        tainer
                    );

                    document.body.appendChild(tainer);
                }}
                onMouseLeave={() => {
                    const tainer = document.getElementById(this.contentId);
                    if (tainer)
                        document.body.removeChild(tainer);
                }}
            >
                {this.props.children}
            </div>
        );
    }
}

export namespace Tooltip {
    export interface Props {
        text: string;
        leftOffset: string;
        topOffset: string;
    }
}


