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
            const tools = <div class={`flex flex-row items-center justify-start space-x-1 ${isMac ? 'ml-[128px]' : ''}`}>
                <button class="p-1 rounded stroke-1 group hover:bg-neutral-700" tabIndex={-1} onClick={this.execute} data-command="file:new">
                    <plasticity-icon name="new"></plasticity-icon>
                    <plasticity-tooltip placement="bottom" command="file:new">New document</plasticity-tooltip>
                </button>
                <button class="p-1 rounded stroke-1 group hover:bg-neutral-700" tabIndex={-1} onClick={this.execute} data-command="file:save-as">
                    <plasticity-icon name="export"></plasticity-icon>
                    <plasticity-tooltip placement="bottom" command="file:save-as">Export document (OBJ, STEP, ...)</plasticity-tooltip>
                </button>
                <button class="p-1 rounded group hover:bg-neutral-700" tabIndex={-1} onClick={this.execute} data-command="file:open">
                    <plasticity-icon name="import"></plasticity-icon>
                    <plasticity-tooltip placement="bottom" command="file:open">Import document</plasticity-tooltip>
                </button>
            </div>;

            const windowButtons = <div class="flex flex-row justify-start items-center space-x-1">
                <button class="p-2 rounded group hover:bg-neutral-700" tabIndex={-1}>
                    <i data-feather="minimize" class="w-4 h-4 stroke-neutral-300 group-hover:stroke-neutral-50"></i>
                </button>
                <button class="p-2 rounded group hover:bg-neutral-700" tabIndex={-1}>
                    <i data-feather="maximize" class="w-4 h-4 stroke-neutral-300 group-hover:stroke-neutral-50"></i>
                </button>
                <button class="p-2 rounded group hover:bg-neutral-700" tabIndex={-1}>
                    <i data-feather="x" class="w-4 h-4 stroke-neutral-300 group-hover:stroke-neutral-50"></i>
                </button>
            </div>;

            render(
                <div class="z-50 drag w-full absolute h-[38px] top-0 flex justify-between p-1 hover:border-b hover:backdrop-blur-sm border-[#0B0B0B]">
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
        }
    }
    customElements.define('plasticity-titlebar', TitleBar);
}