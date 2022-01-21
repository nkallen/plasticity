import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditCylinderParams } from "./CylinderFactory";

export class EditCylinderDialog extends AbstractDialog<EditCylinderParams> {
    title = "Cylinder";

    constructor(protected readonly params: EditCylinderParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { radius: radius, height } = this.params;

        render(
            <>
                <ol>
                    <plasticity-prompt name="Select target bodies" description="to cut or join into"></plasticity-prompt>
                </ol>

                <ul>
                    <li>
                        <label for="radius">Radius</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="radius" value={radius} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
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
customElements.define('cylinder-dialog', EditCylinderDialog);
