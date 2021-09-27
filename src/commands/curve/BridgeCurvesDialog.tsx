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
        const { t1, t2, radius, sense, type } = this.params;

        render(
            <>
                <h4>Bridge Curves</h4>
                <ul>
                    <li>
                        <label for="t1">t1
                        </label>
                        <ispace-number-scrubber name="t1" enabled={type === c3d.ConnectingType.Fillet || type === c3d.ConnectingType.Bridge || type === c3d.ConnectingType.Spline} value={t1} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="t2">t2
                        </label>
                        <ispace-number-scrubber name="t2" enabled={type === c3d.ConnectingType.Fillet || type === c3d.ConnectingType.Bridge || type === c3d.ConnectingType.Spline} value={t2} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="radius">Radius
                        </label>
                        <ispace-number-scrubber enabled={type !== c3d.ConnectingType.Bridge} name="radius" min={0} value={radius} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="type">Type </label>
                        <input type="radio" name="type" id="spline" value={c3d.ConnectingType.Spline} checked={type === c3d.ConnectingType.Spline} onClick={this.onChange}></input>
                        <label class="btn" for="spline">Spline</label>
                        {/* <input type="radio" name="type" id="fillet" value={c3d.ConnectingType.Fillet} checked={type === c3d.ConnectingType.Fillet} onClick={this.onChange}></input>
                        <label class="btn" for="fillet">Fillet</label> */}
                        <input type="radio" name="type" id="bridge" value={c3d.ConnectingType.Bridge} checked={type === c3d.ConnectingType.Bridge} onClick={this.onChange}></input>
                        <label class="btn" for="bridge">Bridge</label>
                        {/* <input type="radio" name="type" id="double" value={c3d.ConnectingType.Double} checked={type === c3d.ConnectingType.Double} onClick={this.onChange}></input>
                        <label class="btn" for="double">Double</label> */}
                    </li>
                    <li>
                        <label for="sense">Sense
                        </label>
                        <input type="checkbox" name="sense" checked={sense} onClick={this.onChange}></input>
                    </li>
                </ul></>, this);
    }
}
customElements.define('ispace-bridge-curves-dialog', BridgeCurvesDialog);
