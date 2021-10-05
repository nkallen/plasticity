import { CompositeDisposable } from 'event-kit';
import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import file from 'bootstrap-icons/icons/file-earmark.svg';
import save from 'bootstrap-icons/icons/save.svg';
import upload from 'bootstrap-icons/icons/upload.svg';
import open from 'bootstrap-icons/icons/folder2-open.svg';

export default (editor: Editor) => {
    class Header extends HTMLElement {
        private readonly dispose = new CompositeDisposable();

        constructor() {
            super();
            this.render = this.render.bind(this);

        }

        connectedCallback() { this.render() }
        disconnectedCallback() { }

        render() {
            render(
                <ol>
                    <li>
                        <button type="button" onClick={_ => editor.clear()} tabIndex={-1}>
                            <img src={file}></img>
                            <ispace-tooltip placement="bottom">New document</ispace-tooltip>
                        </button>
                    </li>
                    <li>
                        <button type="button" onClick={_ => editor.clear()} tabIndex={-1}>
                            <img src={save}></img>
                            <ispace-tooltip placement="bottom">Save document</ispace-tooltip>
                        </button>
                    </li>
                    <li>
                        <button type="button" onClick={_ => editor.export()} tabIndex={-1}>
                            <img src={upload}></img>
                            <ispace-tooltip placement="bottom">Export document (OBJ, STEP, ...)</ispace-tooltip>
                        </button>
                    </li>
                    <li>
                        <button type="button" onClick={_ => editor.open()} tabIndex={-1}>
                            <img src={open}></img>
                            <ispace-tooltip placement="bottom">Import document</ispace-tooltip>
                        </button>
                    </li>
                </ol>
                , this);
        }
    }
    customElements.define('ispace-header', Header);
}