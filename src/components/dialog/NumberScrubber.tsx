import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import * as THREE from "three";

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated

export class ChangeEvent extends Event {
    constructor(type: string, readonly value: number) {
        super(type);
    }
}

export default (editor: Editor) => {
    type ScrubberState = { tag: 'none' } | { tag: 'cancel' } | { tag: 'down', downEvent: PointerEvent, startValue: number, disposable: CompositeDisposable } | { tag: 'dragging', downEvent: PointerEvent, startEvent: PointerEvent, currentEvent: PointerEvent, startValue: number, currentValue: number, disposable: CompositeDisposable }

    class Scrubber extends HTMLElement {
        static get observedAttributes() { return ['value']; }

        private _precision = 3;
        get precision() { return this._precision }
        set precision(precision: number) { this._precision = precision }

        private state: ScrubberState = { tag: 'none' };

        constructor() {
            super();
            this.render = this.render.bind(this);
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);
            this.onFocus = this.onFocus.bind(this);
            this.onPointerLockChange = this.onPointerLockChange.bind(this);
            this.change = this.change.bind(this);
            this.toggle = this.toggle.bind(this);
        }

        private _enabled = true;
        set enabled(enabled: boolean) { this._enabled = enabled }

        connectedCallback() { this.render() }

        toggle(e: Event) {
            e.stopPropagation();
            e.preventDefault();
            let newValue;
            if (this.isDisabled) {
                const value = this.getAttribute('previous') ?? this.getAttribute('default')!;
                this.setAttribute('value', value);
                newValue = value;
            } else {
                const disabled = this.getAttribute('disabled')!;
                this.setAttribute('previous', this.getAttribute('value')!);
                newValue = disabled;
                this.setAttribute('value', newValue);
            }
            const event = new ChangeEvent('change', Number(newValue));
            this.dispatchEvent(event);
            this.render();
        }

        scrub(value: number) {
            this.setAttribute("value", String(this.trunc(value)));
            this.render();
            const event = new ChangeEvent('scrub', value);
            this.dispatchEvent(event);
        }

        private trunc(value: number) {
            const stringMin = this.getAttribute('min');
            const min = stringMin !== null ? +stringMin : Number.MAX_VALUE;
            const stringMax = this.getAttribute('max');
            const max = stringMax !== null ? +stringMax : Number.MAX_VALUE;
            return Math.max(min, Math.min(max, value));
        }

        change(e: Event) {
            if (!(e.target instanceof HTMLInputElement)) throw new Error("invalid precondtion");
            e.stopPropagation();

            const value = e.target.value;

            let num = Number(value);
            if (Number.isFinite(num)) {
                num = this.trunc(num);
                this.setAttribute('value', value);
                const event = new ChangeEvent('change', num);
                this.dispatchEvent(event);
            }
            e.target.blur();
            this.state = { tag: 'none' };
            this.render()
        }

        finish(e: PointerEvent) {
            const event = new Event('finish');
            this.dispatchEvent(event);
        }

        cancel() {
            this.state = { tag: 'cancel' }
            this.render();
            const event = new Event('cancel');
            this.dispatchEvent(event);
        }

        onPointerMove(e: PointerEvent) {
            switch (this.state.tag) {
                case 'down': {
                    const { downEvent, disposable, startValue } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    const currentPosition = new THREE.Vector2(e.clientX, e.clientY);
                    const startPosition = new THREE.Vector2(downEvent.clientX, downEvent.clientY);
                    const dragStartTime = downEvent.timeStamp;
                    if (e.timeStamp - dragStartTime >= consummationTimeThreshold ||
                        currentPosition.distanceTo(startPosition) >= consummationDistanceThreshold
                    ) {
                        this.state = { tag: 'dragging', downEvent, disposable, startValue, startEvent: e, currentEvent: e, currentValue: startValue }
                        document.addEventListener('pointerlockchange', this.onPointerLockChange)
                        disposable.add(new Disposable(() => document.removeEventListener('pointerlockchange', this.onPointerLockChange)));
                        this.requestPointerLock();
                    }
                    break;
                }
                case 'dragging':
                    const { precision } = this;
                    const { downEvent } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;

                    // NOTE: in windows only, the first event sometimes has a large jump (>100px)
                    // this is a temporary(?) workaround.
                    const delta = this.state.startEvent === this.state.currentEvent
                        ? 0
                        : e.movementX / 3;
                    
                    // Speed up (10x) when Shift is held. Slow down (0.1x) when alt is held.
                    const precisionSpeedMod = e.shiftKey ? -1 : e.altKey ? 1 : 0;
                    const precisionAndSpeed = precision + precisionSpeedMod;

                    this.state.currentValue += delta * Math.pow(10, -precisionAndSpeed);
                    const value = this.state.currentValue;
                    try { this.scrub(value) }
                    catch (e) { console.error(e) }
                    finally { this.state.currentEvent = e }
                    break;
                default: throw new Error('invalid state: ' + this.state.tag);
            }
        }

        onPointerDown(e: PointerEvent) {
            switch (this.state.tag) {
                case 'none':
                    e.stopPropagation();
                    // preventDefault here prevents scrubber from focusing on start of drag
                    // (will focus later with the onCancel: onClick)
                    e.preventDefault();

                    const stringValue = this.getAttribute('value')!;
                    const startValue = +stringValue;

                    const disposables = new CompositeDisposable();

                    document.addEventListener('pointermove', this.onPointerMove);
                    document.addEventListener('pointerup', this.onPointerUp);
                    disposables.add(new Disposable(() => document.removeEventListener('pointermove', this.onPointerMove)));
                    disposables.add(new Disposable(() => document.removeEventListener('pointerup', this.onPointerUp)));

                    this.state = { tag: 'down', downEvent: e, disposable: disposables, startValue: startValue };
                    break;
                default: throw new Error('invalid state: ' + this.state.tag);
            }
        }

        onFocus(e: FocusEvent) {
            if (this.isDisabled) return;
            this.state = { tag: 'cancel' };
            this.render();
        }

        onPointerUp(e: PointerEvent) {
            switch (this.state.tag) {
                case 'down': {
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    disposable.dispose();
                    this.state = { tag: 'none' };
                    this.cancel();
                    break;
                }
                case 'dragging':
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;

                    try { this.finish(e) }
                    catch (e) { console.error(e) }
                    finally {
                        document.exitPointerLock();
                        disposable.dispose();
                        this.state = { tag: 'none' };
                    }
                    break;
                default: throw new Error('invalid state: ' + this.state.tag);
            }
        }

        onPointerLockChange() {
            switch (this.state.tag) {
                case 'dragging':
                    if (document.pointerLockElement === this) {
                        document.addEventListener('pointermove', this.onPointerMove);
                        document.addEventListener('pointerup', this.onPointerUp);
                        this.state.disposable.add(new Disposable(() => {
                            document.removeEventListener('pointermove', this.onPointerMove);
                            document.removeEventListener('pointerup', this.onPointerUp);
                        }));
                    }
                    break;
                default: throw new Error('invalid state: ' + this.state.tag);
            }
        }

        render() {
            const stringValue = this.getAttribute('value')!;
            const startValue = +stringValue;
            const precisionDigits = this.precision - 1;
            const displayValue = startValue.toFixed(precisionDigits);
            const decimalIndex = stringValue.lastIndexOf(".");
            const rawPrecisionDigits = decimalIndex >= 0 ? stringValue.length - decimalIndex - 1 : 0;
            const full = this.isDisabled ? '' : `${displayValue}${precisionDigits > 0 && precisionDigits < rawPrecisionDigits ? '...' : ''}`;

            const stringMin = this.getAttribute('min');
            const min = stringMin !== null ? +stringMin : undefined;
            const stringMax = this.getAttribute('max');
            const max = stringMax !== null ? +stringMax : undefined;
            const stringDisabled = this.getAttribute('disabled');
            const disabled = stringDisabled !== null ? +stringDisabled : undefined;

            const that = this;
            const onBlur = () => { that.state = { tag: 'none' }; that.render() };
            let input;

            const classes = `py-1 px-2 w-full h-6 text-xs leading-tight text-center align-middle rounded bg-neutral-700 text-neutral-200 ${this.isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800'}`;
            switch (this.state.tag) {
                case 'none':
                case 'dragging':
                    input = <div class={classes} onPointerDown={this.onPointerDown} disabled={this.isDisabled} tabIndex={0} onFocus={this.onFocus}>
                        <span class="prefix"></span>
                        <span class="value">{full}</span>
                        <span class="suffix"></span>
                    </div>
                    break;
                case 'cancel':
                    input = <input type="text" value={displayValue} ref={i => { i?.focus(); i?.select() }} onBlur={onBlur} onChange={this.change} disabled={this.isDisabled} onKeyDown={e => e.stopPropagation()} class={classes} />
                    break;
                default: throw new Error('invalid state: ' + this.state.tag);
            }

            let checkbox = <></>;
            if (disabled !== undefined) checkbox = <input type="checkbox" checked={!this.isDisabled} onChange={this.toggle} onMouseDown={e => e.preventDefault()}></input>;

            render(<> {checkbox} {input} </>, this);
        }

        attributeChangedCallback(name: string, oldValue: any, newValue: any) {
            switch (this.state.tag) {
                case 'none': this.render();
            }
        }

        get isDisabled() {
            const stringDisabled = this.getAttribute('disabled');
            const stringValue = this.getAttribute('value')!;
            return !this._enabled || stringValue === stringDisabled;
        }
    }
    customElements.define('plasticity-number-scrubber', Scrubber);
}