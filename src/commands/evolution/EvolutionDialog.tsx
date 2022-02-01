import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { EvolutionParams, Mode } from './EvolutionFactory';

export class EvolutionDialog extends AbstractDialog<EvolutionParams> {
    name = "Evolution";

    constructor(protected readonly params: EvolutionParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { thickness1, thickness2, mode } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="thickness1">Thickness 1 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="thickness2">Thickness 1 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="mode">Mode</label>
                        <div class="fields">
                            <input type="radio" hidden name="mode" id="neutral" value={Mode.Parallel} checked={mode === Mode.Parallel} onClick={this.onChange}></input>
                            <label for="neutral">Sphere</label>

                            <input type="radio" hidden name="mode" id="negative" value={Mode.PreserveAngle} checked={mode === Mode.PreserveAngle} onClick={this.onChange}></input>
                            <label for="negative">Torus</label>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-evolution-dialog', EvolutionDialog);
