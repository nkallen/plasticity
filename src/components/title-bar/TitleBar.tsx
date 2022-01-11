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
                <button class="p-1 rounded stroke-1 group hover:bg-neutral-700">
                    <svg width="24" height="24" class="w-5 h-5 stroke-2 text-neutral-300 group-hover:text-neutral-50" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12H12M15 12H12M12 12V9M12 12V15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M4 21.4V2.6C4 2.26863 4.26863 2 4.6 2H16.2515C16.4106 2 16.5632 2.06321 16.6757 2.17574L19.8243 5.32426C19.9368 5.43679 20 5.5894 20 5.74853V21.4C20 21.7314 19.7314 22 19.4 22H4.6C4.26863 22 4 21.7314 4 21.4Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M16 5.4V2.35355C16 2.15829 16.1583 2 16.3536 2C16.4473 2 16.5372 2.03725 16.6036 2.10355L19.8964 5.39645C19.9628 5.46275 20 5.55268 20 5.64645C20 5.84171 19.8417 6 19.6464 6H16.6C16.2686 6 16 5.73137 16 5.4Z" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <ispace-tooltip placement="bottom">New document</ispace-tooltip>
                </button>
                <button class="p-1 rounded stroke-1 group hover:bg-neutral-700">
                    <svg width="24" height="24" class="w-5 h-5 stroke-2 text-neutral-300 group-hover:text-neutral-50" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" stroke-width="1.5" />
                        <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="1.5" />
                        <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                    <ispace-tooltip placement="bottom">Export document (OBJ, STEP, ...)</ispace-tooltip>
                </button>
                <button class="p-1 rounded group hover:bg-neutral-700">
                    <svg width="24" height="24" class="w-5 h-5 stroke-2 text-neutral-300 group-hover:text-neutral-50" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 13V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M12 3L12 15M12 15L8.5 11.5M12 15L15.5 11.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <ispace-tooltip placement="bottom">Import document</ispace-tooltip>
                </button>
            </div>;

            const windowButtons = <div class="flex flex-row justify-start items-center space-x-1">
                <button class="p-2 rounded group hover:bg-neutral-700">
                    <i data-feather="minimize" class="w-4 h-4 stroke-neutral-300 group-hover:stroke-neutral-50"></i>
                </button>
                <button class="p-2 rounded group hover:bg-neutral-700">
                    <i data-feather="maximize" class="w-4 h-4 stroke-neutral-300 group-hover:stroke-neutral-50"></i>
                </button>
                <button class="p-2 rounded group hover:bg-neutral-700">
                    <i data-feather="x" class="w-4 h-4 stroke-neutral-300 group-hover:stroke-neutral-50"></i>
                </button>
            </div>;

            render(
                <div class="drag w-full absolute h-[42px] top-0 flex justify-between p-1 bg-neutral-900 hover:border-b-[0.5px] border-[#0B0B0B] transition-all">
                    {tools}
                    {!isMac && windowButtons}
                </div>, this);
        }
    }
    customElements.define('plasticity-titlebar', TitleBar);
}