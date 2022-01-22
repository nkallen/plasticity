import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { OffsetFaceParams } from "./OffsetFaceFactory";

export class OffsetFaceDialog extends AbstractDialog<OffsetFaceParams> {
    name = "Offset face";

    constructor(protected readonly params: OffsetFaceParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance } = this.params;

        render(
            <>
                <ul>
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
customElements.define('offset-face-dialog', OffsetFaceDialog);
