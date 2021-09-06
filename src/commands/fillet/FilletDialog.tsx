import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import FilletFactory, { FilletParams, Mode } from "./FilletFactory";
import c3d from '../../../build/Release/c3d.node';
import distance1_2 from './img/distance1-2.jpg';
import conic1 from './img/conic1.jpg';
import conic2 from './img/conic2.jpg';
import span1 from './img/span1.jpg';
import span2 from './img/span2.jpg';
import beginningLength from './img/begLength.png';
import prolong_ from './img/prolong.png';
import equable1 from './img/equable1.png';
import equable2 from './img/equable2.png';
import cant1 from './img/cant1.png';
import cant2 from './img/cant2.png';
import cant3 from './img/cant3.jpg';
import corner1 from './img/corner1.jpg';
import corner2 from './img/corner2.jpg';
import corner3 from './img/corner3.jpg';

export class FilletDialog extends AbstractDialog<FilletParams> {
    private mode: Mode = c3d.CreatorType.FilletSolid;

    constructor(protected readonly params: FilletParams, signals: EditorSignals) {
        super(signals);
    }

    toggle(mode: Mode) {
        this.mode = mode;
        this.render();
    }

    render() {
        const { conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.params;
        let { distance1, distance2 } = this.params;

        render(
            <>
                <h4>{this.mode === c3d.CreatorType.ChamferSolid ? 'Chamfer' : 'Fillet'}</h4>
                <ul>
                    <li>
                        <label for="distance1">Distance 1
                            <ispace-tooltip><img src={distance1_2} /></ispace-tooltip>
                        </label>
                        <ispace-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="distance2">Distance 2</label>
                        <ispace-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li class={this.mode === c3d.CreatorType.ChamferSolid ? 'disabled' : ''}>
                        <label for="conic">Conic
                            <ispace-tooltip><img src={conic1} /><img src={conic2} /></ispace-tooltip>
                        </label>
                        <ispace-number-scrubber disabled={0} min={0.05} max={0.95} default={0.5} name="conic" value={conic} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="begLength">Beginning length
                            <ispace-tooltip><img src={beginningLength} /></ispace-tooltip>
                        </label>
                        <ispace-number-scrubber disabled={FilletFactory.LengthSentinel} min={0} default={0} name="begLength" value={begLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="endLength">End length</label>
                        <ispace-number-scrubber disabled={FilletFactory.LengthSentinel} min={0} default={0} name="endLength" value={endLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li class={this.mode === c3d.CreatorType.ChamferSolid ? 'disabled' : ''}>
                        <label for="form">Form
                            <ispace-tooltip><img src={span1} /><img src={span2} /></ispace-tooltip>
                        </label>

                        <input type="radio" name="form" id="fillet" value={c3d.SmoothForm.Fillet} checked={form === c3d.SmoothForm.Fillet} onClick={this.onChange}></input>
                        <label class="btn" for="fillet">Fillet</label>
                        <input type="radio" name="form" id="span" value={c3d.SmoothForm.Span} checked={form === c3d.SmoothForm.Span} onClick={this.onChange}></input>
                        <label class="btn" for="span">Span</label>
                    </li>
                    <li>
                        <label for="smoothCorner">Corner
                            <ispace-tooltip><img src={corner1} /><img src={corner2} /><img src={corner3} /></ispace-tooltip>
                        </label>
                        <select name="smoothCorner" value={smoothCorner} onChange={this.onChange}>
                            <option value={c3d.CornerForm.pointed}>Pointed</option>
                            <option value={c3d.CornerForm.uniform}>Uniform</option>
                            <option value={c3d.CornerForm.sharp}>Sharp</option>
                        </select>
                    </li>
                    <li>
                        <label for="prolong">Prolong
                            <ispace-tooltip><img src={prolong_} /></ispace-tooltip>
                        </label>
                        <input type="checkbox" name="prolong" checked={prolong} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="keepCant">Overrun
                            <ispace-tooltip><img src={cant1} /><img src={cant2} /><img src={cant3} /></ispace-tooltip>
                        </label>
                        <select name="keepCant" value={keepCant} onChange={this.onChange}>
                            <option value="-1">Warp</option>
                            <option value="0">Flow</option>
                            <option value="1">Trim</option>
                        </select>
                    </li>
                    <li class={this.mode === c3d.CreatorType.ChamferSolid ? 'disabled' : ''}>
                        <label for="strict">Strict</label>
                        <input type="checkbox" name="strict" checked={strict} onChange={this.onChange}></input>
                    </li>
                    <li class={this.mode === c3d.CreatorType.ChamferSolid ? 'disabled' : ''}>
                        <label for="equable">Equable
                            <ispace-tooltip><img src={equable1} /><img src={equable2} /></ispace-tooltip>
                        </label>
                        <input type="checkbox" name="equable" checked={equable} onChange={this.onChange}></input>
                    </li>

                </ul></>, this);
    }
}
customElements.define('ispace-fillet-dialog', FilletDialog);
