import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { OffsetFaceParams } from "./OffsetFaceFactory";

export class OffsetFaceDialog extends AbstractDialog<OffsetFaceParams> {
    constructor(protected readonly params: OffsetFaceParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance } = this.params;

        render(
            <>
                <h4>Offset face</h4>
                <ul>
                    <li>
                        <label for="distance">Distance</label>
                        <ispace-number-scrubber name="distance" value={distance} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('offset-face-dialog', OffsetFaceDialog);
