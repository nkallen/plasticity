import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { SpiralParams } from './SpiralFactory';

export class SpiralDialog extends AbstractDialog<SpiralParams> {
    name = "Spiral";

    constructor(protected readonly params: SpiralParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { step, radius, angle } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="step">Step</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="step" value={step} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="step">Radius</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="radius" value={radius} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="angle">Angle</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="angle" value={angle} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-spiral-dialog', SpiralDialog);
