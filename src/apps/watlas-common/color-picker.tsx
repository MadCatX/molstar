import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Colors } from './colors';
import { PushButton } from './push-button';
import { SpinBox } from './spin-box';

interface State {
    currentColor: number;
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
            currentColor: 0,
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

        const { h, s } = Colors.colorToHsv(this.state.currentColor);

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

        const x = h / hueStep;
        const y = (1.0 - s) / satStep;

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

        const { h, s, v } = Colors.colorToHsv(this.state.currentColor);

        const w = canvas.width;
        const valStep = 1.0 / canvas.height;

        for (let y = 0; y < canvas.height; y++) {
            const cv = 1.0 - y * valStep;

            ctx.fillStyle = Colors.hsvToHexString(h, s, cv);
            ctx.fillRect(0, y, w, 1);
        }

        const y = (1.0 - v) / valStep;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, y, w / 2, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(w / 2, y, w / 2, 3);
    }

    private paletteCoordsToColor(x: number, y: number) {
        const palette = this.paletteRef.current!;

        const h = 360 * x / palette.width;
        const s = 1.0 - 1.0 * y / palette.height;
        const v = Colors.colorToHsv(this.state.currentColor).v;

        return Colors.hsvToColor(h, s, v);
    }

    private valueColumnCoordToColor(y: number) {
        const valCol = this.valueColumnRef.current!;

        const { h, s } = Colors.colorToHsv(this.state.currentColor);
        const val = 1.0 - 1.0 * y / valCol.height;

        return Colors.hsvToColor(h, s, val);
    }

    componentDidMount() {
        this.drawPalette();
        this.drawValueColumn();
        this.setState({ ...this.state, currentColor: this.props.initialColor });
    }

    componentDidUpdate(prevProps: ColorPicker.Props, prevState: State) {
        if (this.state.currentColor !== prevState.currentColor) {
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

                            const clr = this.paletteCoordsToColor(x, y);
                            this.setState({ ...this.state, currentColor: clr });
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
                            const clr = this.valueColumnCoordToColor(y);
                            this.setState({ ...this.state, currentColor: clr });
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
                            background: Colors.colorToHexString(this.state.currentColor),
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
                        value={Colors.colorToRgb(this.state.currentColor).r}
                        onChange={r => {
                            const { g, b } = Colors.colorToRgb(this.state.currentColor);
                            this.setState({ ...this.state, currentColor: Colors.colorFromRgb(parseInt(r), g, b) });
                        }}
                    />
                    <div>G</div>
                    <SpinBox
                        min={0}
                        max={255}
                        step={1}
                        value={Colors.colorToRgb(this.state.currentColor).g}
                        onChange={g => {
                            const { r, b } = Colors.colorToRgb(this.state.currentColor);
                            this.setState({ ...this.state, currentColor: Colors.colorFromRgb(r, parseInt(g), b) });
                        }}
                    />
                    <div>B</div>
                    <SpinBox
                        min={0}
                        max={255}
                        step={1}
                        value={Colors.colorToRgb(this.state.currentColor).b}
                        onChange={b => {
                            const { r, g } = Colors.colorToRgb(this.state.currentColor);
                            this.setState({ ...this.state, currentColor: Colors.colorFromRgb(r, g, parseInt(b)) });
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
                        value={Math.round(Colors.colorToHsv(this.state.currentColor).h)}
                        onChange={h => {
                            const { s, v } = Colors.colorToHsv(this.state.currentColor);
                            this.setState({ ...this.state, currentColor: Colors.colorFromHsv(parseInt(h), s, v) });
                        }}
                    />
                    <div>S</div>
                    <SpinBox
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(Colors.colorToHsv(this.state.currentColor).s * 100)}
                        onChange={s => {
                            const { h, v } = Colors.colorToHsv(this.state.currentColor);
                            this.setState({ ...this.state, currentColor: Colors.colorFromHsv(h, parseInt(s) / 100, v) });
                        }}
                    />
                    <div>V</div>
                    <SpinBox
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(Colors.colorToHsv(this.state.currentColor).v * 100)}
                        onChange={v => {
                            const { h, s } = Colors.colorToHsv(this.state.currentColor);
                            this.setState({ ...this.state, currentColor: Colors.colorFromHsv(h, s, parseInt(v) / 100) });
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'flex',
                    }}
                >
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                        text='OK'
                        onClick={() => {
                            this.props.onColorPicked(this.state.currentColor);
                            this.dispose();
                        }}
                    />
                    <PushButton
                        className='wva-pushbutton wva-pushbutton-border wva-padded-pushbutton'
                        text='Cancel'
                        onClick={() => this.dispose()}
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
