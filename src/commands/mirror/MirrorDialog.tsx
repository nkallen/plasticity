import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { MirrorParams } from "./MirrorFactory";

export class MirrorDialog extends AbstractDialog<MirrorParams> {
    constructor(protected readonly params: MirrorParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { clipping } = this.params;

        render(
            <>
                <h4>Mirror</h4>
                <ul>
                    <li>
                        <label for="clipping">Clipping </label>
                        <input type="checkbox" name="clipping" checked={clipping} onClick={this.onChange}></input>
                    </li>
                </ul>

            </>
            , this);
    }
}
customElements.define('mirror-dialog', MirrorDialog);
