import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ArrayParams } from "./ArrayFactory";

export class RectangularArrayDialog extends AbstractDialog<ArrayParams> {
    readonly name = "Rectangular array";

    constructor(protected readonly params: ArrayParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { step1, num1, num2, step2 } = this.params;

        render(
            <>
                <ol>
                    <plasticity-prompt name="Select solids or curves" description="to duplicate"></plasticity-prompt>
                    <plasticity-prompt name="Select endpoint 1" description="of the first direction of the array"></plasticity-prompt>
                    <plasticity-prompt name="Select endpoint 2" description="of the second direction of the array"></plasticity-prompt>
                </ol>

                <ul>
                    <li>
                        <label for="step1">Step 1</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="step1" value={step1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="num1">Number</label>
                        <div class="fields">
                            <plasticity-number-scrubber precision={1} name="num1" value={num1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="step2">Step 2</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="step2" value={step2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="num2">Repeat</label>
                        <div class="fields">
                            <plasticity-number-scrubber precision={1} name="num2" value={num2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-rectangular-array-dialog', RectangularArrayDialog);
