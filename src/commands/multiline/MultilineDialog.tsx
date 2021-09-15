import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { MultilineParams } from './MultilineFactory';
import c3d from '../../../build/Release/c3d.node';

export class MultilineDialog extends AbstractDialog<MultilineParams> {
    constructor(protected readonly params: MultilineParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { begTipType, endTipType, radius } = this.params;

        render(
            <>
                <h4>Bridge Curves</h4>
                <ul>
                    <li>
                        <label for="radius">radius
                        </label>
                        <ispace-number-scrubber name="radius" value={radius} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="begTipType">Beginning Tip Type</label>

                        <input type="radio" name="begTipType" id="begTipType_arc" value={c3d.MLTipType.ArcTip} checked={begTipType === c3d.MLTipType.ArcTip} onClick={this.onChange}></input>
                        <label class="btn" for="begTipType_arc">Arc</label>
                        <input type="radio" name="begTipType" id="begTipType_linear" value={c3d.MLTipType.LinearTip} checked={begTipType === c3d.MLTipType.LinearTip} onClick={this.onChange}></input>
                        <label class="btn" for="begTipType_linear">Linear</label>
                    </li>
                    <li>
                        <label for="endTipType">End Tip Type</label>

                        <input type="radio" name="endTipType" id="endTipType_arc" value={c3d.MLTipType.ArcTip} checked={endTipType === c3d.MLTipType.ArcTip} onClick={this.onChange}></input>
                        <label class="btn" for="endTipType_arc">Arc</label>
                        <input type="radio" name="endTipType" id="endTipType_linear" value={c3d.MLTipType.LinearTip} checked={endTipType === c3d.MLTipType.LinearTip} onClick={this.onChange}></input>
                        <label class="btn" for="endTipType_linear">Linear</label>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('ispace-multiline-dialog', MultilineDialog);
