import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ExtensionShellParams } from "./ExtensionShellFactory";
import c3d from '../../../build/Release/c3d.node';

export class ExtensionShellDialog extends AbstractDialog<ExtensionShellParams> {
    name = "Extension shell";

    constructor(protected readonly params: ExtensionShellParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance, type } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="type">Type</label>

                        <div class="fields">
                            <input type="radio" hidden name="type" id="tangent" value={c3d.ExtensionType.tangent} checked={type === c3d.ExtensionType.tangent} onClick={this.onChange}></input>
                            <label class="btn" for="tangent">Tangent</label>
                            <input type="radio" hidden name="type" id="same" value={c3d.ExtensionType.same} checked={type === c3d.ExtensionType.same} onClick={this.onChange}></input>
                            <label class="btn" for="same">Same</label>
                        </div>
                    </li>
                    <li>
                        <label for="distance">Distance</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="distance" value={distance} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('extension-shell-dialog', ExtensionShellDialog);
