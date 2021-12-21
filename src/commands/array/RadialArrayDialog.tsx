import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ArrayParams } from "./ArrayFactory";

export class RadialArrayDialog extends AbstractDialog<ArrayParams> {
    constructor(protected readonly params: ArrayParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { step1, num1, step2, num2, center, isAlongAxis } = this.params;

        render(
            <>
                <h4>Radial Array</h4>
                <ul>
                    <li>
                        <label for="isAlongAxis">Is along axis</label>
                        <input type="checkbox" name="isAlongAxis" checked={isAlongAxis} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="step1">Step 1 </label>
                        <ispace-number-scrubber name="step1" value={step1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="num1">Num 1</label>
                        <ispace-number-scrubber name="num1" value={num1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="step2">Step 2</label>
                        <ispace-number-scrubber name="step2" value={step2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="num2">Num 2</label>
                        <ispace-number-scrubber name="num2" value={num2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul></>, this);
    }
}
customElements.define('ispace-array-dialog', RadialArrayDialog);
