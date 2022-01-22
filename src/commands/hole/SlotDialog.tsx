import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from '../../editor/EditorSignals';
import { SlotParams } from "./SlotFactory";
import c3d from '../../../build/Release/c3d.node';

export class SlotDialog extends AbstractDialog<SlotParams> {
    name = "Slot";

    constructor(protected readonly params: SlotParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { width, depth, floorRadius, tailAngle, bottomWidth, bottomDepth, placeAngle, azimuthAngle, type } = this.params;

        render(
                <ul>
                    <li>
                        <label for="type">Type</label>

                        <div class="fields">
                            <input type="radio" hidden name="type" id="rectangular" value={c3d.SlotType.Rectangular} checked={type === c3d.SlotType.Rectangular} onClick={this.onChange}></input>
                            <label class="btn" for="rectangular">Rect</label>

                            <input type="radio" hidden name="type" id="ball-end" value={c3d.SlotType.BallEnd} checked={type === c3d.SlotType.BallEnd} onClick={this.onChange}></input>
                            <label class="btn" for="ball-end">Ball</label>

                            <input type="radio" hidden name="type" id="t-shaped" value={c3d.SlotType.TShaped} checked={type === c3d.SlotType.TShaped} onClick={this.onChange}></input>
                            <label class="btn" for="t-shaped">T</label>
                        </div>

                    </li>
                    <li>
                        <label for="width">Width</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="width" value={width} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="depth">Depth</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="depth" value={depth} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="tailAngle">Tail angle</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="tailAngle" value={tailAngle} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="bottomWidth">Bottom width</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="bottomWidth" value={bottomWidth} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="bottomDepth">Bottom depth</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="bottomDepth" value={bottomDepth} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul>, this);
    }
}
customElements.define('plasticity-hole-dialog', SlotDialog);
