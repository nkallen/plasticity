import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { FilletParams } from "./FilletFactory";
import c3d from '../../../build/Release/c3d.node';

export class FilletDialog extends AbstractDialog<FilletParams> {
    constructor(protected readonly params: FilletParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.params;
        render(
            <>
                <h4>Fillet</h4>
                <ul>
                    <li>
                        <label for="distance1">Distance 1</label>
                        <ispace-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="distance2">Distance 2</label>
                        <ispace-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="conic">Conic</label>
                        <ispace-number-scrubber disabled={0} min={0.05} max={0.95} default={0.5} name="conic" value={conic} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="begLength">Beginning length</label>
                        <ispace-number-scrubber disabled={-1e300} min={0} default={0} name="begLength" value={begLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="endLength">End length</label>
                        <ispace-number-scrubber disabled={-1e300} min={0} default={0} name="endLength" value={endLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="form">Form</label>

                        <input type="radio" name="form" id="fillet" value={c3d.SmoothForm.Fillet} checked={form === c3d.SmoothForm.Fillet} onClick={this.onChange}></input>
                        <label class="btn" for="fillet">Fillet</label>
                        <input type="radio" name="form" id="span" value={c3d.SmoothForm.Span} checked={form === c3d.SmoothForm.Span} onClick={this.onChange}></input>
                        <label class="btn" for="span">Span</label>
                    </li>
                    <li>
                        <label for="smoothCorner">Corner</label>
                        <select name="smoothCorner" value={smoothCorner} onChange={this.onChange}>
                            <option value={c3d.CornerForm.pointed}>Pointed</option>
                            <option value={c3d.CornerForm.uniform}>Uniform</option>
                            <option value={c3d.CornerForm.sharp}>Sharp</option>
                        </select>
                    </li>
                    <li>
                        <label for="prolong">Prolong</label>
                        <input type="checkbox" name="prolong" checked={prolong} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="keepCant">Overrun</label>
                        <select name="keepCant" value={keepCant} onChange={this.onChange}>
                            <option value="-1">Warp</option>
                            <option value="0">Flow</option>
                            <option value="1">Trim</option>
                        </select>
                    </li>
                    <li>
                        <label for="strict">Strict</label>
                        <input type="checkbox" name="strict" checked={strict} onChange={this.onChange}></input>
                    </li>
                    <li>
                        <label for="equable">Equable</label>
                        <input type="checkbox" name="equable" checked={equable} onChange={this.onChange}></input>
                    </li>

                </ul></>, this);
    }
}
customElements.define('fillet-dialog', FilletDialog);
