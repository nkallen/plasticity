import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { RevolutionParams, Shape } from "./RevolutionFactory";

export class RevolutionDialog extends AbstractDialog<RevolutionParams> {
    name = "Revolution";

    constructor(protected readonly params: RevolutionParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { thickness1, thickness2, side1, side2, shape } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="thickness1">Distance 1 </label>
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
                        <label for="side">Side 1 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="side1" value={side1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="side2">Side 2 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="side2" value={side2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="shape">Topology </label>
                        <div class="fields">
                            <input type="radio" hidden name="shape" id="neutral" value={Shape.Sphere} checked={shape === Shape.Sphere} onClick={this.onChange}></input>
                            <label for="neutral">Sphere</label>

                            <input type="radio" hidden name="shape" id="negative" value={Shape.Torus} checked={shape === Shape.Torus} onClick={this.onChange}></input>
                            <label for="negative">Torus</label>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-revolution-dialog', RevolutionDialog);
