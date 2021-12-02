/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';

export abstract class AbstractPushButton<P extends AbstractPushButton.Props, S> extends React.Component<P, S> {
    abstract renderButton(): React.ReactFragment;

    render() {
        return (
            <>
                {this.renderButton()}
            </>
        );
    }
}

function Noop() {}
export class PushButton extends AbstractPushButton<PushButton.Props, {}> {
    static defaultProps = {
        enabled: true,
    };

    private clsName() {
        if (this.props.enabled)
            return this.props.className ?? 'wva-pushbutton';
        return this.props.classNameDisabled ?? 'wva-pushbutton-disabled';
    }

    private textClsName() {
        if (this.props.enabled)
            return this.props.textClassName ?? 'wva-pushbutton-text';
        return this.props.textClassNameDisabled ?? 'wva-pushbutton-text';
    }

    renderButton() {
        if (this.props.text && this.props.children)
            throw new Error('Watlas PushButton must not specify both text and children properties');

        if (this.props.text) {
            return (
                <div
                    id={this.props.id}
                    className={this.clsName()}
                    onClick={this.props.enabled ? this.props.onClick : Noop}
                >
                    <div className={this.textClsName()}>{this.props.text}</div>
                </div>
            );
        } else {
            return (
                <div
                    id={this.props.id}
                    className={this.clsName()}
                    onClick={this.props.enabled ? this.props.onClick : Noop}
                >
                    {this.props.children}
                </div>
            );
        }
    }
}

export namespace AbstractPushButton {
    export interface OnClick {
        (e: React.MouseEvent<HTMLInputElement>): void;
    }

    export interface Props {
        text?: string;
        id?: string;
        className?: string
        classNameDisabled?: string;
        textClassName?: string;
        textClassNameDisabled?: string;
    }
}

export namespace PushButton {
    export interface OnClick {
        (e: React.MouseEvent<HTMLInputElement>): void;
    }

    export interface Props extends AbstractPushButton.Props {
        onClick: OnClick;
        enabled: boolean;
    }
}