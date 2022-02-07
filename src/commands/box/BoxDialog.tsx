import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { EditBoxParams } from "./BoxFactory";

export class BoxDialog extends AbstractDialog<EditBoxParams> {
    name = "Cylinder";

    constructor(protected readonly params: EditBoxParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { width, length, height } = this.params;

        render(
            <>
                <ol>
                    <plasticity-prompt name="Select target bodies" description="to cut or join into"></plasticity-prompt>
                </ol>

                <ul>
                    <li>
                        <label for="width">Width</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="width" value={width} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="length">Length</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="length" value={length} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="height">Height</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="height" value={height} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>

                </ul>
            </>, this);
    }
}
customElements.define('box-dialog', BoxDialog);
