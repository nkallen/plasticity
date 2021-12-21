import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { RotateParams } from "./TranslateFactory";

export class RotateDialog extends AbstractDialog<RotateParams> {
    constructor(protected readonly params: RotateParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { axis, degrees } = this.params;

        render(
            <>
                <h4>Rotate</h4>
                <ul>
                    <li>
                        <label for="degrees">Angle</label>
                        <ispace-number-scrubber name="degrees" min={-360} max={360} value={degrees} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="axis.x">Axis X</label>
                        <ispace-number-scrubber name="axis.x" min={0} max={1} value={axis.x} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="axis.y">Axis Y</label>
                        <ispace-number-scrubber name="axis.y" min={0} max={1} value={axis.y} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="axis.z">Axis Z</label>
                        <ispace-number-scrubber name="axis.z" min={0} max={1} value={axis.z} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('rotate-dialog', RotateDialog);