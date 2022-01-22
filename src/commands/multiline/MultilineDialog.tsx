import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { MultilineParams } from './MultilineFactory';
import c3d from '../../../build/Release/c3d.node';

export class MultilineDialog extends AbstractDialog<MultilineParams> {
    name = "Multiline";

    constructor(protected readonly params: MultilineParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { begTipType, endTipType, radius } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="radius">Radius</label>

                        <div class="fields">
                            <plasticity-number-scrubber name="radius" value={radius} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="begTipType">Beginning Tip</label>

                        <div class="fields">
                            <input type="radio" hidden name="begTipType" id="begTipType_arc" value={c3d.MLTipType.ArcTip} checked={begTipType === c3d.MLTipType.ArcTip} onClick={this.onChange}></input>
                            <label class="btn" for="begTipType_arc">Arc</label>
                            <input type="radio" hidden name="begTipType" id="begTipType_linear" value={c3d.MLTipType.LinearTip} checked={begTipType === c3d.MLTipType.LinearTip} onClick={this.onChange}></input>
                            <label class="btn" for="begTipType_linear">Linear</label>
                        </div>
                    </li>
                    <li>
                        <label for="endTipType">End Tip</label>

                        <div class="fields">
                            <input type="radio" hidden name="endTipType" id="endTipType_arc" value={c3d.MLTipType.ArcTip} checked={endTipType === c3d.MLTipType.ArcTip} onClick={this.onChange}></input>
                            <label class="btn" for="endTipType_arc">Arc</label>
                            <input type="radio" hidden name="endTipType" id="endTipType_linear" value={c3d.MLTipType.LinearTip} checked={endTipType === c3d.MLTipType.LinearTip} onClick={this.onChange}></input>
                            <label class="btn" for="endTipType_linear">Linear</label>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('plasticity-multiline-dialog', MultilineDialog);
