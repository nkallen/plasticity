import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { FilletParams } from "./FilletFactory";

export class FilletDialog extends AbstractDialog<FilletParams> {
    constructor(protected readonly params: FilletParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.params;
        render(
            <ul>
                <li>
                    <label for="distance1">distance1</label>
                    <ispace-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="distance2">distance2</label>
                    <ispace-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="conic">conic</label>
                    <ispace-number-scrubber name="conic" value={conic} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="begLength">begLength</label>
                    <ispace-number-scrubber name="begLength" value={begLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="endLength">endLength</label>
                    <ispace-number-scrubber name="endLength" value={endLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="form">form</label>
                    <select name="form" value={form} onChange={this.onChange}>
                        <option value="-1">Span</option>
                        <option value="0">Fillet</option>
                    </select>
                </li>
                <li>
                    <label for="smoothCorner">smoothCorner</label>
                    <select name="smoothCorner" value={smoothCorner} onChange={this.onChange}>
                        <option value="0">Pointed</option>
                        <option value="1">Either</option>
                        <option value="2">Uniform</option>
                        <option value="3">Sharp</option>
                    </select>
                </li>
                <li>
                    <label for="prolong">prolong</label>
                    <input type="checkbox" name="prolong" checked={prolong} onClick={this.onChange}></input>
                </li>
                <li>
                    <label for="keepCant">keepCant</label>
                    <select name="keepCant" value={keepCant} onChange={this.onChange}>
                    <option value="-1">Keep</option>
                    <option value="0">Neut</option>
                        <option value="1">Unkeep</option>
                    </select>
                </li>
                <li>
                    <label for="strict">strict</label>
                    <input type="checkbox" name="strict" checked={strict} onChange={this.onChange}></input>
                </li>
                <li>
                    <label for="equable">equable</label>
                    <input type="checkbox" name="equable" checked={equable} onChange={this.onChange}></input>
                </li>

            </ul>, this);
    }
}
customElements.define('fillet-dialog', FilletDialog);
