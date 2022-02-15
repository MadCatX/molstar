/**
 * Copyright (c) 2018-2022 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import './assets/imgs/triangle-up.svg';
import './assets/imgs/triangle-down.svg';

function defaultFormatter(v: number|null) {
    if (v === null)
        return '';
    return v.toString();
}

export class SpinBox extends React.Component<SpinBox.Props> {
    private clsDisabled() {
        return this.props.classNameDisabled ?? 'wva-spinbox-input-disabled';
    }

    private clsEnabled() {
        return this.props.className ?? 'wva-spinbox-input';
    }

    private decrease() {
        if (this.props.value === null)
            return;
        const nv = this.props.value - this.props.step;
        if (nv >= this.props.min)
            this.props.onChange(nv.toString());
    }

    private increase() {
        if (this.props.value === null)
            return;
        const nv = this.props.value + this.props.step;
        if (nv >= this.props.min)
            this.props.onChange(nv.toString());
    }

    render() {
        return (
            <div className='wva-spinbox-container'>
                <input
                    type='text'
                    className={this.props.disabled ? this.clsDisabled() : this.clsEnabled()}
                    value={this.props.formatter ? this.props.formatter(this.props.value) : defaultFormatter(this.props.value)}
                    onChange={evt => this.props.onChange(evt.currentTarget.value)}
                    onWheel={evt => {
                        if (this.props.value === null)
                            return;
                        if (evt.deltaY < 0) {
                            const nv = this.props.value + this.props.step;
                            if (nv <= this.props.max)
                                this.props.onChange(nv.toString());
                        } else if (evt.deltaY > 0) {
                            const nv = this.props.value - this.props.step;
                            if (nv >= this.props.min)
                                this.props.onChange(nv.toString());
                        }
                    }}
                />
                <div className='wva-spinbox-buttons'>
                    <img
                        className='wva-spinbox-button'
                        src={`./${this.props.pathPrefix}assets/imgs/triangle-up.svg`} onClick={() => this.increase()}
                    />
                    <img
                        className='wva-spinbox-button'
                        src={`./${this.props.pathPrefix}assets/imgs/triangle-down.svg`} onClick={() => this.decrease()}
                    />
                </div>
            </div>
        );
    }
}

export namespace SpinBox {
    export interface Formatter {
        (v: number|null): string;
    }

    export interface OnChange {
        (newValue: string): void;
    }

    export interface Props {
        value: number|null;
        onChange: OnChange;
        min: number;
        max: number;
        step: number;
        pathPrefix: string;
        disabled?: boolean;
        className?: string;
        classNameDisabled?: string;
        formatter?: Formatter;
    }
}
