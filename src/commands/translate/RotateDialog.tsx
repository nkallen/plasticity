import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { RotateParams } from "./TranslateFactory";

export class RotateDialog extends AbstractDialog<RotateParams> {
    name = "Rotate";

    constructor(protected readonly params: RotateParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { axis, degrees } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="degrees">Angle</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="degrees" min={-360} max={360} value={degrees} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="axis">Axis</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="axis.x" min={0} max={1} value={axis.x} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="axis.y" min={0} max={1} value={axis.y} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="axis.z" min={0} max={1} value={axis.z} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('rotate-dialog', RotateDialog);