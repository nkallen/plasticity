import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { OffsetFaceParams } from "./OffsetFaceFactory";
import { Agent } from '../../editor/DatabaseLike';

export class OffsetFaceDialog extends AbstractDialog<OffsetFaceParams> {
    name = "Offset face";

    constructor(protected readonly params: OffsetFaceParams, private readonly agent: Agent, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { agent } = this;
        const { distance } = this.params;

        render(
            <>
                <ul>
                    {agent === 'user' &&
                        <ol>
                            <plasticity-prompt name="Select edges" description="to fillet or chamfer"></plasticity-prompt>
                        </ol>
                    }
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
