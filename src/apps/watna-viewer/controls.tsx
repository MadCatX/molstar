/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import * as React from 'react';
import { PushButton } from '../watlas-common/push-button';
import { SpinBox } from '../watlas-common/spin-box';

const MinClip = 0.05;
const MaxClip = 1.20;
const ClipStep = 0.05;
const MinImgDim = 1;

interface State {
    imageWidth: number;
    imageHeight: number;
    imageKeepAspectRatio: boolean;
    imageDimsShown: boolean;
    imageTransparentBackground: boolean;
}

export class Controls extends React.Component<Controls.Props, State> {
    constructor(props: Controls.Props) {
        super(props);

        this.state = {
            imageWidth: 1000,
            imageHeight: 1000,
            imageKeepAspectRatio: true,
            imageDimsShown: false,
            imageTransparentBackground: true,
        };
    }

    render() {
        return (
            <div className='wnav-ctrls'>
                <div className='wnav-ctrl-line wnav-ctrl-item'>
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border'
                        text='Save view as image'
                        onClick={() => this.props.onSaveViewAsImage(Math.round(this.state.imageWidth), Math.round(this.state.imageHeight), this.state.imageTransparentBackground)}
                    />
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-symbolic-pushbutton'
                        onClick={() => this.setState({ ...this.state, imageDimsShown: !this.state.imageDimsShown })}
                    >
                        {this.state.imageDimsShown
                            ? <img src={`${this.props.pathPrefix}assets/imgs/triangle-up.svg`} />
                            : <img src={`${this.props.pathPrefix}assets/imgs/triangle-down.svg`} />
                        }
                    </PushButton>
                </div>
                {this.state.imageDimsShown ?
                    <>
                        <div className='wnav-ctrl-line wnav-ctrl-item'>
                            <div className='wnav-ctrl-imgdims-line-one wnav-ctrl-fullwidth'>
                                <div className='wva-tight'>Width</div>
                                <SpinBox
                                    value={Math.round(this.state.imageWidth)}
                                    min={MinImgDim}
                                    max={20000}
                                    step={1}
                                    onChange={v => {
                                        let w = parseInt(v);
                                        if (isNaN(w) || w < MinImgDim)
                                            w = MinImgDim;
                                        if (this.state.imageKeepAspectRatio) {
                                            const ar = this.state.imageWidth / this.state.imageHeight;
                                            const h = w / ar;
                                            if (h >= MinImgDim)
                                                this.setState({ ...this.state, imageWidth: w, imageHeight: h });
                                        } else
                                            this.setState({ ...this.state, imageWidth: w });
                                    }}
                                />
                                <div className='wva-tight'>Height</div>
                                <SpinBox
                                    value={Math.round(this.state.imageHeight)}
                                    min={MinImgDim}
                                    max={20000}
                                    step={1}
                                    onChange={v => {
                                        let h = parseInt(v);
                                        if (isNaN(h) || h < MinImgDim)
                                            h = MinImgDim;
                                        if (this.state.imageKeepAspectRatio) {
                                            const ar = this.state.imageWidth / this.state.imageHeight;
                                            const w = ar * h;
                                            if (w >= MinImgDim)
                                                this.setState({ ...this.state, imageWidth: w, imageHeight: h });
                                        } else
                                            this.setState({ ...this.state, imageHeight: h });
                                    }}
                                />
                            </div>
                        </div>
                        <div className='wnav-ctrl-line wnav-ctrl-item'>
                            <div className='wva-tight'>Keep aspect ratio</div>
                            <input
                                className='wva-checkbox'
                                type='checkbox'
                                checked={this.state.imageKeepAspectRatio}
                                onChange={evt => this.setState({ ...this.state, imageKeepAspectRatio: evt.currentTarget.checked })}
                            />
                        </div>
                        <div className='wnav-ctrl-line wnav-ctrl-item'>
                            <div className='wva-tight'>Transparent background</div>
                            <input
                                className='wva-checkbox'
                                type='checkbox'
                                checked={this.state.imageTransparentBackground}
                                onChange={evt => this.setState({ ...this.state, imageTransparentBackground: evt.currentTarget.checked })}
                            />
                        </div>
                        <div className='wnav-ctrl-line wnav-ctrl-item'>
                            <PushButton
                                className='wva-pushbutton wva-pushbutton-border wnav-ctrl-fullwidth'
                                text='Same image size as viewer'
                                onClick={() => {
                                    const { width, height } = this.props.getCanvasSize();
                                    if (width > 0 && height > 0)
                                        this.setState({ ...this.state, imageWidth: width, imageHeight: height });
                                }}
                            />
                        </div>
                    </>
                    :
                    undefined
                }
                <div className='wnav-ctrl-line wnav-ctrl-item'>
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wnav-ctrl-fullwidth'
                        text='Reset colors'
                        onClick={() => this.props.onResetColors()}
                    />
                </div>
                {
                    !this.props.disableStepWaters
                        ?
                        <div className='wnav-ctrl-line wnav-ctrl-item'>
                            <div className='wva-tight'>Show {this.props.nucleotideWatersName.toLowerCase()}</div>
                            <div className='wva-vcenter-box'>
                                <input
                                    className='wva-checkbox'
                                    type='checkbox'
                                    checked={this.props.showStepWaters}
                                    onChange={evt => this.props.onHideShowStepWaters(evt.currentTarget.checked)}
                                />
                            </div>
                        </div>
                        :
                        undefined
                }
                <div className='wnav-ctrl-line wnav-ctrl-item'>
                    <div className='wva-tight'>Clip radius</div>
                    <div className='wva-slider-spinbox-group'>
                        <input
                            className='wva-range-slider'
                            type='range'
                            value={this.props.camClipRadius}
                            min={MinClip}
                            max={MaxClip}
                            step={ClipStep}
                            onChange={evt => this.props.onCamClipRadiusChanged(parseFloat(evt.currentTarget.value))}
                        />
                        <SpinBox
                            value={this.props.camClipRadius}
                            min={MinClip}
                            max={MaxClip}
                            step={ClipStep}
                            onChange={v => this.props.onCamClipRadiusChanged(parseFloat(v))}
                            formatter={v => v.toFixed(2)}
                        />
                    </div>
                </div>
                <div className='wnav-ctrl-line wnav-ctrl-item'>
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wnav-ctrl-fullwidth'
                        text='Reset camera'
                        onClick={() => this.props.onResetCamera()}
                    />
                </div>
            </div>
        );
    }
}

export namespace Controls {
    export interface CanvasSizeGetter {
        (): { width: number, height: number }
    }

    export interface OnCamClipRadiusChanged {
        (radius: number): void;
    }

    export interface OnHideShowStepWaters {
        (show: boolean): void;
    }

    export interface OnSaveViewAsImage {
        (width: number, height: number, transparentBackground: boolean): void;
    }

    export interface OnAction {
        (): void;
    }

    export interface Props {
        disableStepWaters: boolean;
        camClipRadius: number;
        getCanvasSize: CanvasSizeGetter;
        nucleotideWatersName: string;
        showStepWaters: boolean;
        onCamClipRadiusChanged: OnCamClipRadiusChanged;
        onHideShowStepWaters: OnHideShowStepWaters;
        onResetCamera: OnAction;
        onResetColors: OnAction;
        onSaveViewAsImage: OnSaveViewAsImage;
        pathPrefix?: string;
    }
}
