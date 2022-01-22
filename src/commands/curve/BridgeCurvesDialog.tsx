import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { BridgeCurvesParams } from './BridgeCurvesFactory';
import c3d from '../../../build/Release/c3d.node';

export class BridgeCurvesDialog extends AbstractDialog<BridgeCurvesParams> {
    name = "Bridge curves";

    constructor(protected readonly params: BridgeCurvesParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { t1, t2, sense1, sense2, tension1, tension2, mating1, mating2, type } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="t1">t1</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="t1" enabled={type === c3d.ConnectingType.Fillet || type === c3d.ConnectingType.Bridge || type === c3d.ConnectingType.Spline} value={t1} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="t2">t2</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="t2" enabled={type === c3d.ConnectingType.Fillet || type === c3d.ConnectingType.Bridge || type === c3d.ConnectingType.Spline} value={t2} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="type">Type </label>
                        <div class="fields">
                            <input type="radio" hidden name="type" id="spline" value={c3d.ConnectingType.Spline} checked={type === c3d.ConnectingType.Spline} onClick={this.onChange}></input>
                            <label class="btn" for="spline">Spline</label>
                            <input type="radio" hidden name="type" id="bridge" value={c3d.ConnectingType.Bridge} checked={type === c3d.ConnectingType.Bridge} onClick={this.onChange}></input>
                            <label class="btn" for="bridge">Bridge</label>
                        </div>
                    </li>
                    <li class={type === c3d.ConnectingType.Spline ? 'disabled' : ''}>
                        <label for="sense1">Sense 1</label>
                        <div class="fields">
                            <input type="checkbox" id="sense1" hidden name="sense1" disabled={type === c3d.ConnectingType.Spline} checked={sense1} onClick={this.onChange}></input>
                            <label for="sense1">Sense 1</label>
                        </div>
                    </li>
                    <li class={type === c3d.ConnectingType.Spline ? 'disabled' : ''}>
                        <label for="sense2">Sense 2</label>
                        <div class="fields">
                            <input type="checkbox" hidden name="sense2" id="sense2" disabled={type === c3d.ConnectingType.Spline} checked={sense2} onClick={this.onChange}></input>
                            <label for="sense1">Sense 2</label>
                        </div>
                    </li>
                    <li class={type === c3d.ConnectingType.Bridge ? 'disabled' : ''}>
                        <label for="tension1">Tension 1</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="tension1" enabled={type === c3d.ConnectingType.Spline} value={tension1} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li class={type === c3d.ConnectingType.Bridge ? 'disabled' : ''}>
                        <label for="tension2">Tension 2</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="tension2" enabled={type === c3d.ConnectingType.Spline} value={tension2} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li class={type === c3d.ConnectingType.Bridge ? 'disabled' : ''}>
                        <label for="mating1">Mating 1</label>
                        <div class="fields">
                            <input type="radio" hidden name="mating1" id="mating1_tangent" value={c3d.MatingType.Tangent} checked={mating1 === c3d.MatingType.Tangent} onClick={this.onChange}></input>
                            <label class="btn" for="mating1_tangent">Tangent</label>

                            <input type="radio" hidden name="mating1" id="mating1_smoothg2" value={c3d.MatingType.SmoothG2} checked={mating1 === c3d.MatingType.SmoothG2} onClick={this.onChange}></input>
                            <label class="btn" for="mating1_smoothg2">G2</label>

                            <input type="radio" hidden name="mating1" id="mating1_smoothg3" value={c3d.MatingType.SmoothG3} checked={mating1 === c3d.MatingType.SmoothG3} onClick={this.onChange}></input>
                            <label class="btn" for="mating1_smoothg3">G3</label>
                        </div>
                    </li>
                    <li class={type === c3d.ConnectingType.Bridge ? 'disabled' : ''}>
                        <label for="mating2">Mating 2</label>
                        <div class="fields">
                            <input type="radio" hidden name="mating2" id="mating2_tangent" value={c3d.MatingType.Tangent} checked={mating2 === c3d.MatingType.Tangent} onClick={this.onChange}></input>
                            <label class="btn" for="mating2_tangent">Tangent</label>

                            <input type="radio" hidden name="mating2" id="mating2_smoothg2" value={c3d.MatingType.SmoothG2} checked={mating2 === c3d.MatingType.SmoothG2} onClick={this.onChange}></input>
                            <label class="btn" for="mating2_smoothg2">G2</label>

                            <input type="radio" hidden name="mating2" id="mating2_smoothg3" value={c3d.MatingType.SmoothG3} checked={mating2 === c3d.MatingType.SmoothG3} onClick={this.onChange}></input>
                            <label class="btn" for="mating2_smoothg3">G3</label>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-bridge-curves-dialog', BridgeCurvesDialog);
