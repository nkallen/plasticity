import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ArrayParams } from "./ArrayFactory";

export class RadialArrayDialog extends AbstractDialog<ArrayParams> {
    title = "Array";

    constructor(protected readonly params: ArrayParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { step1, num1, step2, num2, isAlongAxis } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="isAlongAxis">Is along axis</label>
                        <div class="fields">
                            <input type="checkbox" hidden id="isAlongAxis" name="isAlongAxis" checked={isAlongAxis} onClick={this.onChange}></input>
                            <label for="isAlongAxis">Add tangent edges</label>
                        </div>
                    </li>
                    <li>
                        <label for="step1">Step 1 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="step1" value={step1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="num1">Num 1</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="num1" value={num1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="step2">Step 2</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="step2" value={step2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="num2">Num 2</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="num2" value={num2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-array-dialog', RadialArrayDialog);
