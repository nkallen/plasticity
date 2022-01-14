import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { MirrorParams } from "./MirrorFactory";

export class MirrorDialog extends AbstractDialog<MirrorParams> {
    title = "Mirror";

    constructor(protected readonly params: MirrorParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { shouldUnion, shouldCut } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="shouldCut">Cut</label>
                        <div class="fields">
                            <input type="checkbox" hidden id="shouldCut" name="shouldCut" checked={shouldCut} onClick={this.onChange}></input>
                            <label for="shouldCut">Slice down mirror plane</label>
                        </div>
                    </li>
                    <li>
                        <label for="shouldUnion">Union</label>
                        <div class="fields">
                            <input type="checkbox" hidden id="shouldUnion" name="shouldUnion" checked={shouldUnion} onClick={this.onChange}></input>
                            <label for="shouldUnion">Merge halves together</label>
                        </div>
                    </li>
                </ul>

            </>
            , this);
    }
}
customElements.define('mirror-dialog', MirrorDialog);
