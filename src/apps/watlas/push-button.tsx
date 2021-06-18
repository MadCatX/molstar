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
    }

    private clsName() {
        if (this.props.enabled)
            return this.props.className ?? 'pushbutton-common pushbutton-default pushbutton-clr-default pushbutton-hclr-default';
        else
            return this.props.classNameDisabled ?? 'pushbutton-common pushbutton-default pushbutton-clr-default-disabled';
    }

    renderButton() {
        return (
            <div
                id={this.props.id}
                className={this.clsName()}
                onClick={this.props.enabled ? this.props.onClick : Noop}>
                <div className='pushbutton-text'>{this.props.value}</div>
            </div>
        );
    }
}

export namespace AbstractPushButton {
    export interface OnClick {
        (e: React.MouseEvent<HTMLInputElement>): void;
    }

    export interface Props {
        value: string;
        id?: string;
        className?: string
        classNameDisabled?: string;
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