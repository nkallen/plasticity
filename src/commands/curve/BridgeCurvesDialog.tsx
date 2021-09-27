import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { BridgeCurvesParams } from './BridgeCurvesFactory';
import c3d from '../../../build/Release/c3d.node';

export class BridgeCurvesDialog extends AbstractDialog<BridgeCurvesParams> {
    constructor(protected readonly params: BridgeCurvesParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { t1, t2, sense1, sense2, tension1, tension2, mating1, mating2, type } = this.params;

        render(
            <>
                <h4>Bridge Curves</h4>
                <ul>
                    <li>
                        <label for="t1">t1</label>
                        <ispace-number-scrubber name="t1" enabled={type === c3d.ConnectingType.Fillet || type === c3d.ConnectingType.Bridge || type === c3d.ConnectingType.Spline} value={t1} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="t2">t2</label>
                        <ispace-number-scrubber name="t2" enabled={type === c3d.ConnectingType.Fillet || type === c3d.ConnectingType.Bridge || type === c3d.ConnectingType.Spline} value={t2} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="type">Type </label>
                        <input type="radio" name="type" id="spline" value={c3d.ConnectingType.Spline} checked={type === c3d.ConnectingType.Spline} onClick={this.onChange}></input>
                        <label class="btn" for="spline">Spline</label>
                        <input type="radio" name="type" id="bridge" value={c3d.ConnectingType.Bridge} checked={type === c3d.ConnectingType.Bridge} onClick={this.onChange}></input>
                        <label class="btn" for="bridge">Bridge</label>
                    </li>
                    <li>
                        <label for="sense1">Sense 1</label>
                        <input type="checkbox" name="sense1" disabled={type === c3d.ConnectingType.Spline} checked={sense1} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="sense2">Sense 2</label>
                        <input type="checkbox" name="sense2" disabled={type === c3d.ConnectingType.Spline} checked={sense2} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="tension1">Tension 1</label>
                        <ispace-number-scrubber name="tension1" enabled={type === c3d.ConnectingType.Spline} value={tension1} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="tension2">Tension 2</label>
                        <ispace-number-scrubber name="tension2" enabled={type === c3d.ConnectingType.Spline} value={tension2} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="mating1">Mating 1</label>
                        <input type="radio" name="mating1" id="mating1_tangent" value={c3d.MatingType.Tangent} disabled={type === c3d.ConnectingType.Bridge} checked={mating1 === c3d.MatingType.Tangent} onClick={this.onChange}></input>
                        <label class="btn" for="mating1_tangent">Tangent</label>

                        <input type="radio" name="mating1" id="mating1_smoothg2" value={c3d.MatingType.SmoothG2} disabled={type === c3d.ConnectingType.Bridge} checked={mating1 === c3d.MatingType.SmoothG2} onClick={this.onChange}></input>
                        <label class="btn" for="mating1_smoothg2">G2</label>

                        <input type="radio" name="mating1" id="mating1_smoothg3" value={c3d.MatingType.SmoothG3} disabled={type === c3d.ConnectingType.Bridge} checked={mating1 === c3d.MatingType.SmoothG3} onClick={this.onChange}></input>
                        <label class="btn" for="mating1_smoothg3">G3</label>
                    </li>
                    <li>
                        <label for="mating2">Mating 2</label>
                        <input type="radio" name="mating2" id="mating2_tangent" value={c3d.MatingType.Tangent} disabled={type === c3d.ConnectingType.Bridge} checked={mating2 === c3d.MatingType.Tangent} onClick={this.onChange}></input>
                        <label class="btn" for="mating2_tangent">Tangent</label>

                        <input type="radio" name="mating2" id="mating2_smoothg2" value={c3d.MatingType.SmoothG2} disabled={type === c3d.ConnectingType.Bridge} checked={mating2 === c3d.MatingType.SmoothG2} onClick={this.onChange}></input>
                        <label class="btn" for="mating2_smoothg2">G2</label>

                        <input type="radio" name="mating2" id="mating2_smoothg3" value={c3d.MatingType.SmoothG3} disabled={type === c3d.ConnectingType.Bridge} checked={mating2 === c3d.MatingType.SmoothG3} onClick={this.onChange}></input>
                        <label class="btn" for="mating2_smoothg3">G3</label>
                    </li>
                </ul></>, this);
    }
}
customElements.define('ispace-bridge-curves-dialog', BridgeCurvesDialog);
