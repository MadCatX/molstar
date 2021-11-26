/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';

export class SpinBox extends React.Component<SpinBox.Props> {
    private clsDisabled() {
        return this.props.classNameDisabled ?? 'wnav-spinbox-disabled';
    }

    private clsEnabled() {
        return this.props.className ?? 'wnav-spinbox';
    }

    render() {
        return (
            <input
                type='number'
                className={this.props.disabled ? this.clsDisabled() : this.clsEnabled()}
                value={this.props.formatter ? this.props.formatter(this.props.value) : this.props.value}
                min={this.props.min}
                max={this.props.max}
                step={this.props.step}
                onChange={evt => this.props.onChange(evt.currentTarget.value)}
                onWheel={evt => {
                    if (evt.deltaY < 0) {
                        const nv = this.props.value + this.props.step;
                        if (nv <= this.props.max)
                            this.props.onChange(`${nv}`);
                    } else if (evt.deltaY > 0) {
                        const nv = this.props.value - this.props.step;
                        if (nv >= this.props.min)
                            this.props.onChange(`${nv}`);
                    }
                }}
            />
        );
    }
}

export namespace SpinBox {
    export interface Formatter {
        (v: number): string;
    }

    export interface OnChange {
        (newValue: string): void;
    }

    export interface Props {
        value: number;
        onChange: OnChange;
        min: number;
        max: number;
        step: number;
        disabled?: boolean;
        className?: string;
        classNameDisabled?: string;
        formatter?: Formatter;
    }
}
