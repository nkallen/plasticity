import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import * as THREE from "three";
import _ from "underscore-plus";
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GConstructor } from '../../util/Util';
import { icons, tooltips } from './icons';

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated

export default (editor: Editor) => {
    class CommandButton extends HTMLButtonElement {
        private klass: typeof Command;
        // private title: string;
        private tooltip: string;

        constructor() {
            super();

            const name = this.getAttribute('name');
            if (!name) throw "invalid name";
            // this.title = name;

            type CommandName = keyof typeof cmd;
            const CommandName = _.undasherize(name).replace(/\s+/g, '') + 'Command' as CommandName;
            const klass = cmd[CommandName];
            if (klass == null) throw `${name} is invalid (${CommandName})`;
            this.klass = klass;

            const tooltip = tooltips.get(klass);
            if (!tooltip) throw "no matching tooltip for command " + CommandName;
            this.tooltip = tooltip;

            this.execute = this.execute.bind(this);
        }

        connectedCallback() {
            this.addEventListener('click', this.execute);
            this.render();
        }

        render() {
            const { klass, tooltip } = this;
            const result = <>
                <img src={icons.get(klass)}></img>
                <ispace-tooltip command={`command:${klass.title}`}>{tooltip}</ispace-tooltip>
            </>
            render(result, this);
        }

        execute() {
            const klass = this.klass as unknown as GConstructor<Command>;
            editor.enqueue(new klass(editor));
        }
    }
    customElements.define('ispace-command', CommandButton, { extends: 'button' });

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
                        button.execute();
                    }

                    disposable.dispose();
                    this.state = { tag: 'none' };
                    this.render();
                    break;
            }
        }
    }
    customElements.define('ispace-button-group', ButtonGroup);
}
