/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';

export class ComboBox extends React.Component<ComboBox.Props> {
    render() {
        return (
            <div className='wnav-combobox-container'>
                <select
                    className='wnav-combobox'
                    value={this.props.value}
                    onChange={evt => this.props.onChange(evt.target.value)}
                >
                    {this.props.options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.caption}</option>)}
                </select>
                <div className='wnav-combobox-arrow'>▼</div>
            </div>
        );
    }
}

export namespace ComboBox {
    export interface Props {
        options: { value: string, caption: string }[];
        value: string;
        onChange(value: string): void;
    }
}
