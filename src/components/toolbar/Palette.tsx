import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import * as THREE from "three";
import _ from "underscore-plus";
import Command from '../../command/Command';
import * as cmd from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { GConstructor } from '../../util/Util';
import { tooltips } from './icons';

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated

export default (editor: Editor) => {
    class CommandButton extends HTMLElement {
        private command!: GConstructor<Command> & { identifier: string };
        private tooltip?: string;

        private _name!: string;
        get name() { return this._name }
        set name(name: string) {
            this._name = name

            const CommandName = _.undasherize(name).replace(/\s+/g, '') + 'Command' as keyof typeof cmd;
            const klass = cmd[CommandName];
            if (klass == null) throw `${name} is invalid (${CommandName})`;

            const tooltip = tooltips.get(klass);
            if (!tooltip) console.error("no matching tooltip for command " + CommandName);

            this.command = klass;
            this.tooltip = tooltip;
        }

        connectedCallback() { this.render() }

        render() {
            const { command, tooltip, name } = this;
            render(
                <div class="p-2 cursor-pointer bg-accent-800 hover:bg-accent-600"
                    onClick={this.execute} >
                    <plasticity-icon name={name}></plasticity-icon>

                    {/* {this.tooltip !== undefined && <plasticity-tooltip command={`command:${command.identifier}`} placement="left">{tooltip}</plasticity-tooltip>} */}
                </div >, this);
        }

        execute = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const klass = this.command;
            editor.enqueue(new klass(editor));
        }
    }
    customElements.define('plasticity-command', CommandButton);

    type ButtonGroupState = { tag: 'none' } | { tag: 'down', downEvent: PointerEvent, disposable: CompositeDisposable } | { tag: 'open', downEvent: PointerEvent, disposable: CompositeDisposable };
    class ButtonGroup extends HTMLElement {
        private selected = 0;
        private state: ButtonGroupState = { tag: 'none' };
        private original!: string;

        constructor() {
            super();
            this.render = this.render.bind(this);
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);
        }

        connectedCallback() {
            this.original = this.innerHTML;
            this.render();
            this.addEventListener('pointerdown', this.onPointerDown)
        }

        render() {
            switch (this.state.tag) {
                case 'none': {
                    for (const [i, child] of Array.from(this.children).entries()) {
                        if (!(child instanceof CommandButton)) continue;
                        if (i == this.selected) continue;
                        child.style.display = 'none';
                    }
                    break;
                }
                case 'open': {
                    const { disposable } = this.state;
                    const pos = this.getBoundingClientRect();
                    const submenu = document.createElement('section');
                    submenu.className = 'submenu';
                    submenu.innerHTML = this.original;
                    submenu.style.top = '0px';
                    submenu.style.left = '0px';
                    document.body.appendChild(submenu);
                    disposable.add(new Disposable(() => submenu.remove()));

                    const actualWidth = submenu.offsetWidth;
                    const actualHeight = submenu.offsetHeight;
                    const offset = {
                        top: pos.top + pos.height / 2 - actualHeight / 2,
                        left: pos.left - actualWidth
                    };

                    submenu.style.top = offset.top + 'px';
                    submenu.style.left = offset.left + 'px';
                    document.body.appendChild(submenu);
                    break;
                }
            }
        }

        private onPointerDown(e: PointerEvent) {
            switch (this.state.tag) {
                case 'none': {
                    e.stopPropagation();
                    e.preventDefault();
                    window.addEventListener('pointermove', this.onPointerMove);
                    window.addEventListener('pointerup', this.onPointerUp);
                    const disposables = new CompositeDisposable();
                    disposables.add(new Disposable(() => window.removeEventListener('pointermove', this.onPointerMove)));
                    disposables.add(new Disposable(() => window.removeEventListener('pointerup', this.onPointerUp)));
                    this.state = { tag: 'down', downEvent: e, disposable: disposables };
                    break;
                }
                default: throw new Error('invalid state: ' + this.state.tag);
            }
        }

        private onPointerMove(e: PointerEvent) {
            switch (this.state.tag) {
                case 'down': {
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    const currentPosition = new THREE.Vector2(e.clientX, e.clientY);
                    const startPosition = new THREE.Vector2(downEvent.clientX, downEvent.clientY);
                    const dragStartTime = downEvent.timeStamp;
                    if (e.timeStamp - dragStartTime >= consummationTimeThreshold ||
                        currentPosition.distanceTo(startPosition) >= consummationDistanceThreshold
                    ) {
                        this.state = { tag: 'open', downEvent, disposable }
                        this.render();
                    }
                }
                case 'open':
                    const { downEvent } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    break;
                default: throw new Error('invalid state: ' + this.state.tag);
            }
        }

        private onPointerUp(e: PointerEvent) {
            switch (this.state.tag) {
                case 'down': {
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;
                    disposable.dispose();
                    this.state = { tag: 'none' };
                    this.render();
                    break;
                }
                case 'open':
                    const { downEvent, disposable } = this.state;
                    if (e.pointerId !== downEvent.pointerId) return;

                    const button = e.target;
                    if (button instanceof CommandButton) {
                        button.execute(e);
                    }

                    disposable.dispose();
                    this.state = { tag: 'none' };
                    this.render();
                    break;
            }
        }
    }
    customElements.define('plasticity-button-group', ButtonGroup);

    class Palette extends HTMLElement {
        connectedCallback() { this.render() }

        render() {
            return render(
                <div class="flex absolute right-2 top-1/2 flex-col space-y-2 -translate-y-1/2">
                    <section class="flex flex-col space-y-0.5">
                        <plasticity-command name="line" class="shadow-lg first:rounded-t last:rounded-b overflow-clip"></plasticity-command>
                        <plasticity-command name="curve" class="shadow-lg first:rounded-t last:rounded-b overflow-clip"></plasticity-command>
                        <plasticity-button-group class="shadow-lg first:rounded-t last:rounded-b overflow-clip">
                            <plasticity-command name="center-circle"></plasticity-command>
                            <plasticity-command name="two-point-circle"></plasticity-command>
                            <plasticity-command name="three-point-circle"></plasticity-command>
                        </plasticity-button-group>
                        <plasticity-button-group class="shadow-lg first:rounded-t last:rounded-b overflow-clip">
                            <plasticity-command name="center-point-arc"></plasticity-command>
                            <plasticity-command name="three-point-arc"></plasticity-command>
                        </plasticity-button-group>
                        <plasticity-button-group class="shadow-lg first:rounded-t last:rounded-b overflow-clip">
                            <plasticity-command name="center-ellipse"></plasticity-command>
                            <plasticity-command name="three-point-ellipse"></plasticity-command>
                        </plasticity-button-group>
                        <plasticity-button-group class="shadow-lg first:rounded-t last:rounded-b overflow-clip">
                            <plasticity-command name="corner-rectangle"></plasticity-command>
                            <plasticity-command name="center-rectangle"></plasticity-command>
                            <plasticity-command name="three-point-rectangle"></plasticity-command>
                        </plasticity-button-group>
                        <plasticity-command name="polygon"></plasticity-command>
                        <plasticity-button-group class="shadow-lg first:rounded-t last:rounded-b overflow-clip">
                            <plasticity-command name="spiral"></plasticity-command>
                            <plasticity-command name="character-curve"></plasticity-command>
                        </plasticity-button-group>
                        <plasticity-command name="trim" class="shadow-lg first:rounded-t last:rounded-b overflow-clip"></plasticity-command>
                        <plasticity-command name="bridge-curves" class="shadow-lg first:rounded-t last:rounded-b overflow-clip"></plasticity-command>
                    </section>
                    <section class="flex flex-col space-y-0.5">
                        <plasticity-command name="sphere" class="shadow-lg first:rounded-t last:rounded-b overflow-clip"></plasticity-command>
                        <plasticity-command name="cylinder" class="shadow-lg first:rounded-t last:rounded-b overflow-clip"></plasticity-command>
                        <plasticity-button-group class="shadow-lg first:rounded-t last:rounded-b overflow-clip">
                            <plasticity-command name="corner-box"></plasticity-command>
                            <plasticity-command name="center-box"></plasticity-command>
                            <plasticity-command name="three-point-box"></plasticity-command>
                        </plasticity-button-group>
                    </section>
                </div>, this);
        }
    }
    customElements.define('plasticity-palette', Palette);
}
