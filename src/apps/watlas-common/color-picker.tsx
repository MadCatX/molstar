import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Colors } from './colors';
import { PushButton } from './push-button';
import { SpinBox } from './spin-box';

interface State {
    h: number;
    s: number;
    v: number;
    restoreOnCancel: boolean;
}

function colorsMatch(a: State, b: State) {
    return a.h === b.h &&
           a.s === b.s &&
           a.v === b.v;
}

export class ColorPicker extends React.Component<ColorPicker.Props, State> {
    private paletteRef: React.RefObject<HTMLCanvasElement>;
    private valueColumnRef: React.RefObject<HTMLCanvasElement>;
    private selfRef: React.RefObject<HTMLDivElement>;

    constructor(props: ColorPicker.Props) {
        super(props);

        this.paletteRef = React.createRef();
        this.valueColumnRef = React.createRef();
        this.selfRef = React.createRef();

        this.state = {
            h: 0,
            s: 0,
            v: 0,
            restoreOnCancel: false,
        };
    }

    private calcLeft() {
        const self = this.selfRef.current;
        if (!self)
            return this.props.left;

        const bw = document.body.clientWidth;
        const right = self.offsetLeft + self.clientWidth;
        const overhang = right - bw;
        if (overhang > 0)
            return this.props.left - 1.1 * overhang;
        return self.offsetLeft;
    }

    private calcTop() {
        const self = this.selfRef.current;
        if (!self)
            return this.props.top;

        const bh = document.body.clientHeight;
        const bottom = self.offsetTop + self.clientHeight;
        const overhang = bottom - bh;
        if (overhang > 0)
            return this.props.top - 1.1 * overhang;
        return self.offsetTop;
    }

    private dispose() {
        document.body.removeChild(this.props.parentElement);
    }

    private drawPalette() {
        if (!this.paletteRef.current)
            return;

        const canvas = this.paletteRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;

        const hueStep = 360 / canvas.width;
        const satStep = 1.0 / canvas.height;

        for (let x = 0; x < canvas.width; x++) {
            const hue = hueStep * x;
            for (let y = 0; y < canvas.height; y++) {
                const sat = 1.0 - satStep * y;

                ctx.fillStyle = Colors.hsvToHexString(hue, sat, 1.0);
                ctx.fillRect(x, y, 1, 1);
            }
        }

        const x = this.state.h / hueStep;
        const y = (1.0 - this.state.s) / satStep;

        ctx.fillStyle = '#000000';

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
    }

    private drawValueColumn() {
        if (!this.valueColumnRef.current)
            return;

        const canvas = this.valueColumnRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;

        const w = canvas.width;
        const valStep = 1.0 / canvas.height;

        for (let y = 0; y < canvas.height; y++) {
            const cv = 1.0 - y * valStep;

            ctx.fillStyle = Colors.hsvToHexString(this.state.h, this.state.s, cv);
            ctx.fillRect(0, y, w, 1);
        }

        const y = (1.0 - this.state.v) / valStep;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, y, w / 2, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(w / 2, y, w / 2, 3);
    }

    private paletteCoordsToHueSat(x: number, y: number) {
        const palette = this.paletteRef.current!;

        const h = 360 * x / palette.width;
        const s = 1.0 - 1.0 * y / palette.height;

        return { h, s };
    }

    private valueColumnCoordToVal(y: number) {
        const valCol = this.valueColumnRef.current!;

        return 1.0 - 1.0 * y / valCol.height;
    }

    componentDidMount() {
        this.drawPalette();
        this.drawValueColumn();

        const { h, s, v } = Colors.colorToHsv(this.props.initialColor);
        this.setState({ ...this.state, h, s, v });
    }

    componentDidUpdate(prevProps: ColorPicker.Props, prevState: State) {
        if (!colorsMatch(this.state, prevState)) {
            this.drawPalette()
            this.drawValueColumn();
        }
    }

    render() {
        return (
            <div
                ref={this.selfRef}
                style={{
                    background: 'white',
                    border: '0.15em solid #ccc',
                    boxShadow: '0 0 0.3em 0 rgba(0, 0, 0, 0.5)',
                    left: this.calcLeft(),
                    padding: '0.5em',
                    position: 'absolute',
                    top: this.calcTop(),
                    zIndex: 99,
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridColumnGap: '0.5em',
                        gridTemplateColumns: 'auto auto',
                        marginBottom: '0.5em',
                    }}
                >
                    <canvas
                        ref={this.paletteRef}
                        onClick={evt => {
                            const tainer = this.selfRef.current!;
                            const palette = this.paletteRef.current!
                            let x = evt.pageX - tainer.offsetLeft - tainer.clientLeft - palette.offsetLeft - palette.clientLeft;
                            let y = evt.pageY - tainer.offsetTop - tainer.clientTop - palette.offsetTop - palette.clientTop;

                            if (x < 0)
                                x = 0;
                            else if (x >= palette.width)
                                x = palette.width - 1;
                            if (y < 0)
                                y = 0;
                            else if (y >= palette.height)
                                y = palette.height - 1;

                            const { h, s } = this.paletteCoordsToHueSat(x, y);
                            this.setState({ ...this.state, h, s });
                        }}
                        onWheel={evt => {
                            let h = this.state.h;
                            let s = this.state.s;
                            let xChanged = false;
                            let yChanged = false;

                            if (evt.deltaX !== 0) {
                                h += Math.sign(evt.deltaX);
                                if (h > 359)
                                    h = 359;
                                else if (h < 0)
                                    h = 0;
                                xChanged = true;
                            }
                            if (evt.altKey && evt.deltaY !== 0) {
                                h += Math.sign(evt.deltaY);
                                if (h > 359)
                                    h = 359;
                                else if (h < 0)
                                    h = 0;
                                xChanged = true;
                            }

                            if (evt.deltaY !== 0 && !xChanged) {
                                s -= 0.01 * Math.sign(evt.deltaY);
                                if (s < 0)
                                    s = 0;
                                else if (s > 1)
                                    s = 1;
                                yChanged = true;
                            }

                            if (xChanged || yChanged)
                                this.setState({ ...this.state, h, s });
                        }}
                    />
                    <canvas
                        ref={this.valueColumnRef}
                        style={{
                            height: '100%',
                            width: '1em',
                        }}
                        onClick={evt => {
                            const tainer = this.selfRef.current!;
                            const valCol = this.valueColumnRef.current!
                            let y = evt.pageY - tainer.offsetTop - tainer.clientTop - valCol.offsetTop - valCol.clientTop;
                            if (y < 0)
                                y = 0;
                            else if (y >= valCol.height)
                                y = valCol.height - 1;
                            const v = this.valueColumnCoordToVal(y);
                            this.setState({ ...this.state, v });
                        }}
                        onWheel={evt => {
                            if (evt.deltaY === 0)
                                return;
                            let v = this.state.v - 0.01 * Math.sign(evt.deltaY);
                            if (v < 0)
                                v = 0;
                            else if (v > 1)
                                v = 1;
                            this.setState({ ...this.state, v });
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'flex',
                        marginBottom: '0.5em',
                    }}
                >
                    <div
                        style={{
                            background: Colors.colorToHexString(this.props.initialColor),
                            flex: '1',
                            height: '2em',
                        }}
                    />
                    <div
                        style={{
                            background: Colors.colorToHexString(Colors.colorFromHsv(this.state.h, this.state.s, this.state.v)),
                            flex: '1',
                            height: '2em',
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridColumnGap: '0.5em',
                        gridTemplateColumns: 'auto 4em auto 4em auto 4em',
                        marginBottom: '0.5em',
                    }}
                >
                    <div>R</div>
                    <SpinBox
                        min={0}
                        max={255}
                        step={1}
                        value={Math.round(Colors.hsv2rgb(this.state.h, this.state.s, this.state.v).r)}
                        onChange={r => {
                            const { g, b } = Colors.hsv2rgb(this.state.h, this.state.s, this.state.v);
                            const { h, s, v } = Colors.rgb2hsv(parseInt(r), g, b);
                            this.setState({ ...this.state, h, s, v });
                        }}
                    />
                    <div>G</div>
                    <SpinBox
                        min={0}
                        max={255}
                        step={1}
                        value={Math.round(Colors.hsv2rgb(this.state.h, this.state.s, this.state.v).g)}
                        onChange={g => {
                            const { r, b } = Colors.hsv2rgb(this.state.h, this.state.s, this.state.v);
                            const { h, s, v } = Colors.rgb2hsv(r, parseInt(g), b);
                            this.setState({ ...this.state, h, s, v });
                        }}
                    />
                    <div>B</div>
                    <SpinBox
                        min={0}
                        max={255}
                        step={1}
                        value={Math.round(Colors.hsv2rgb(this.state.h, this.state.s, this.state.v).b)}
                        onChange={b => {
                            const { r, g } = Colors.hsv2rgb(this.state.h, this.state.s, this.state.v);
                            const { h, s, v } = Colors.rgb2hsv(r, g, parseInt(b));
                            this.setState({ ...this.state, h, s, v });
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridColumnGap: '0.5em',
                        gridTemplateColumns: 'auto 4em auto 4em auto 4em',
                        marginBottom: '0.5em',
                    }}
                >
                    <div>H</div>
                    <SpinBox
                        min={0}
                        max={360}
                        step={1}
                        value={Math.round(this.state.h)}
                        onChange={h => {
                            this.setState({ ...this.state, h: parseInt(h) });
                        }}
                    />
                    <div>S</div>
                    <SpinBox
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(this.state.s * 100)}
                        onChange={s => {
                            this.setState({ ...this.state, s: parseInt(s) / 100 });
                        }}
                    />
                    <div>V</div>
                    <SpinBox
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(this.state.v * 100)}
                        onChange={v => {
                            this.setState({ ...this.state, v: parseInt(v) / 100 });
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5em',
                    }}
                >
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                        text='OK'
                        onClick={() => {
                            this.props.onColorPicked(Colors.colorFromHsv(this.state.h, this.state.s, this.state.v));
                            this.dispose();
                        }}
                    />
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                        text='Preview'
                        onClick={() => {
                            this.props.onColorPicked(Colors.colorFromHsv(this.state.h, this.state.s, this.state.v));
                            this.setState({ ...this.state, restoreOnCancel: true });
                        }}
                    />
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                        text='Cancel'
                        onClick={() => {
                            if (this.state.restoreOnCancel)
                                this.props.onColorPicked(this.props.initialColor);
                            this.dispose();
                        }}
                    />
                </div>
            </div>
        );
    }
}

export namespace ColorPicker {
    export interface OnColorPicked {
        (color: number): void;
    }

    export interface Props {
        initialColor: number;
        left: number;
        top: number;
        onColorPicked: OnColorPicked;
        parentElement: HTMLElement;
    }

    export function create<T>(evt: React.MouseEvent<T, MouseEvent>, initialColor: number, handler: OnColorPicked) {
        const tainer = document.createElement('div');

        ReactDOM.render(
            <ColorPicker
                initialColor={initialColor}
                left={evt.clientX}
                top={evt.clientY}
                onColorPicked={handler}
                parentElement={tainer}
            />,
            tainer
        );

        document.body.appendChild(tainer);
    }
}
