import { ipcRenderer } from 'electron';
import { render } from 'preact';
import { Editor } from '../../editor/Editor';

const isMac = process.platform === 'darwin'

export default (editor: Editor) => {
    class TitleBar extends HTMLElement {
        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        connectedCallback() { this.render() }
        disconnectedCallback() { }

        render() {
            const tools = <div class={`flex items-center justify-start space-x-1 mt-7 z-40 ${isMac ? 'ml-[96px]' : ''}`}>
                <button class="no-drag p-1 rounded stroke-1 group text-neutral-300 hover:bg-neutral-700 hover:text-neutral-50 ring-1 ring-neutral-600 ring-opacity-5">
                    <plasticity-icon name="file-menu"> </plasticity-icon>
                    <plasticity-menu placement="bottom" trigger="onclick">
                        <div class="w-72 p-2 rounded-lg text-neutral-50 shadow-black/20 shadow-lg ring-1 ring-neutral-600 ring-opacity-5 overflow-clip backdrop-blur-xl bg-black/30">
                            <ol>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="file:new">
                                    <plasticity-tooltip placement="right" command="file:new"></plasticity-tooltip>
                                    <div class="flex">
                                        <div class="py-4 pr-4"><plasticity-icon name="new"></plasticity-icon></div>
                                        <div class="py-2">
                                            <a class="text-neutral-200 font-semibold text-sm block">New Document</a>
                                            <div class="text-xs text-neutral-300">Start modeling in a empty file</div>
                                        </div>
                                    </div>
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="file:open">
                                    <plasticity-tooltip placement="right" command="file:open"></plasticity-tooltip>
                                    <div class="flex">
                                        <div class="py-4 pr-4"><plasticity-icon name="import"></plasticity-icon></div>
                                        <div class="py-2">
                                            <a class="text-neutral-200 font-semibold text-sm block">Import Document</a>
                                            <div class="text-xs text-neutral-300">Append PNG, STEP, etc.</div>
                                        </div>
                                    </div>
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="file:save-as">
                                    <plasticity-tooltip placement="right" command="file:save-as"></plasticity-tooltip>
                                    <div class="flex">
                                        <div class="py-4 pr-4"><plasticity-icon name="export"></plasticity-icon></div>
                                        <div class="py-2">
                                            <a class="text-neutral-200 font-semibold text-sm block">Export Document</a>
                                            <div class="text-xs text-neutral-300">Export OBJ, STEP, etc.</div>
                                        </div>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </plasticity-menu>
                </button>
                <button class="no-drag p-1 rounded stroke-1 group text-neutral-300 hover:bg-neutral-700 hover:text-neutral-50" tabIndex={-1} data-command="preferences:settings">
                    <plasticity-icon name="settings-menu"></plasticity-icon>
                    <plasticity-menu placement="bottom" trigger="onclick">
                        <div class="w-72 p-2 rounded-lg text-neutral-50 shadow-black/20 shadow-lg ring-1 ring-neutral-600 ring-opacity-5 overflow-clip backdrop-blur-xl bg-black/30">
                            <div class="text-center p-2 text-neutral-200 font-semibold text-sm block">Orbit Settings</div>
                            <ol>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="settings:orbit-controls:set-default">
                                    Default
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="settings:orbit-controls:set-blender">
                                    Blender
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="settings:orbit-controls:set-maya">
                                    Maya
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="settings:orbit-controls:set-moi3d">
                                    Moi3D
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="settings:orbit-controls:set-3dsmax">
                                    3DS Max
                                </li>
                                <li class="hover:bg-white/20 px-5 py-2 rounded-lg" onClick={this.execute} data-command="settings:orbit-controls:set-touchpad">
                                    Touch
                                </li>
                            </ol>
                        </div>
                    </plasticity-menu>
                </button>
            </div>;

            const windowButtons = <div class="flex flex-row justify-start items-center space-x-1 mr-4 mt-7">
                <button class="no-drag p-2 rounded group hover:bg-neutral-600 fill-neutral-300 hover:fill-neutral-50" tabIndex={-1} onClick={e => ipcRenderer.send('window-event', 'window-minimize')}>
                    <plasticity-icon name="minimize"></plasticity-icon>
                </button>
                <button class="no-drag p-2 rounded group hover:bg-neutral-600 fill-neutral-300 hover:fill-neutral-50" tabIndex={-1} onClick={e => ipcRenderer.send('window-event', 'window-maximize')}>
                    <plasticity-icon name="maximize"></plasticity-icon>
                </button>
                <button class="no-drag p-2 rounded group hover:bg-neutral-600 fill-neutral-300 hover:fill-neutral-50" tabIndex={-1} onClick={e => ipcRenderer.send('window-event', 'window-close')}>
                    <plasticity-icon name="close"></plasticity-icon>
                </button>
            </div>;

            render(
                <div class="z-30 w-full absolute h-10 top-0 flex justify-between p-1 drag" onDblClick={e => ipcRenderer.send('window-event', 'window-maximize')}>
                    {tools}
                    {!isMac && windowButtons}
                </div>, this);
        }

        private execute = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            const element = e.currentTarget! as HTMLElement;
            const command = element.getAttribute('data-command');
            if (command === null) {
                console.error("Missing command name: ", element);
                return;
            }

            element.dispatchEvent(new CustomEvent(command, { bubbles: true }));
            element.dispatchEvent(new CustomEvent('closeMenu', { bubbles: true }));
        }
    }
    customElements.define('plasticity-titlebar', TitleBar);
}