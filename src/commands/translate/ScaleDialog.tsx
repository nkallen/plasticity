import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ScaleParams } from "./TranslateFactory";

export class ScaleDialog extends AbstractDialog<ScaleParams> {
    title = "Scale";

    constructor(protected readonly params: ScaleParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { scale } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="scale.x">X</label>
                        <plasticity-number-scrubber name="scale.x" value={scale.x} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="scale.y">Y</label>
                        <plasticity-number-scrubber name="scale.y" value={scale.y} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="scale.z">Z</label>
                        <plasticity-number-scrubber name="scale.z" value={scale.z} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('scale-dialog', ScaleDialog);