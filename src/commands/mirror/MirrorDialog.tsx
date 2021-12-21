import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { MirrorParams } from "./MirrorFactory";

export class MirrorDialog extends AbstractDialog<MirrorParams> {
    constructor(protected readonly params: MirrorParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { shouldUnion, shouldCut } = this.params;

        render(
            <>
                <h4>Mirror</h4>
                <ul>
                    <li>
                        <label for="shouldCut">Cut</label>
                        <input type="checkbox" name="shouldCut" checked={shouldCut} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="shouldUnion">Union</label>
                        <input type="checkbox" name="shouldUnion" checked={shouldUnion} onClick={this.onChange}></input>
                    </li>
                </ul>

            </>
            , this);
    }
}
customElements.define('mirror-dialog', MirrorDialog);
