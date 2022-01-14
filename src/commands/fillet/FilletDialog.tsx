import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
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
    title = "Fillet";

    private mode: Mode = c3d.CreatorType.FilletSolid;

    constructor(protected readonly params: FilletParams, signals: EditorSignals) {
        super(signals);
    }

    toggle(mode: Mode) {
        this.mode = mode;
        this.render();
    }

    render() {
        const { conic, begLength, endLength, form, smoothCorner, prolong, keepCant } = this.params;
        let { distance1, distance2 } = this.params;

        render(
            <>
                <div class="my-1">
                    <ol class="pb-3 m-3 space-y-1 border-b border-neutral-900">
                        <li class="flex items-center px-1 space-x-2">
                            <i data-feather="check" class="w-4 h-4 p-1 bg-green-600 rounded-full stroke-2 stroke-black"></i>
                            <div class=""><span class="text-xs font-bold text-neutral-200">Select edges</span> <span
                                class="text-xs text-neutral-500">to
                                fillet or chamfer</span></div>
                        </li>
                        <li class="flex items-center px-1 space-x-2 rounded-full bg-neutral-800">
                            <i class="w-4 h-4 p-1 rounded-full stroke-2 stroke-black bg-neutral-600"></i>
                            <div class=""><span class="text-xs font-bold text-neutral-200">Select tool bodies</span> <span
                                class="text-xs text-neutral-500">to cut or join with</span></div>
                        </li>
                    </ol>
                </div>

                <ul>
                    <li>
                        <label for="distance1">Distance</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li class={this.mode === c3d.CreatorType.ChamferSolid ? 'disabled' : ''}>
                        <label for="conic">Conic
                            <plasticity-tooltip><img src={conic1} /><img src={conic2} /></plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <plasticity-number-scrubber disabled={0} min={0.05} max={0.95} default={0.5} name="conic" value={conic} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="begLength">Length
                            <plasticity-tooltip><img src={beginningLength} /></plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <plasticity-number-scrubber disabled={FilletFactory.LengthSentinel} min={0} default={0} name="begLength" value={begLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber disabled={FilletFactory.LengthSentinel} min={0} default={0} name="endLength" value={endLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>

                    <li class={this.mode === c3d.CreatorType.ChamferSolid ? 'disabled' : ''}>
                        <label for="form">Form
                            <plasticity-tooltip><img src={span1} /><img src={span2} /></plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <input type="radio" hidden name="form" id="fillet" value={c3d.SmoothForm.Fillet} checked={form === c3d.SmoothForm.Fillet} onClick={this.onChange}></input>
                            <label for="fillet">Fillet</label>
                            <input type="radio" hidden name="form" id="span" value={c3d.SmoothForm.Span} checked={form === c3d.SmoothForm.Span} onClick={this.onChange}></input>
                            <label for="span">Span</label>
                        </div>
                    </li>
                    <li>
                        <label for="smoothCorner">Corner
                            <plasticity-tooltip><img src={corner1} /><img src={corner2} /><img src={corner3} /></plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <input type="radio" hidden name="corner" id="pointed" value={c3d.CornerForm.pointed} checked={smoothCorner === c3d.CornerForm.pointed} onClick={this.onChange}></input>
                            <label for="pointed">Pointed</label>

                            <input type="radio" hidden name="corner" id="uniform" value={c3d.CornerForm.uniform} checked={smoothCorner === c3d.CornerForm.uniform} onClick={this.onChange}></input>
                            <label for="uniform">Uniform</label>

                            <input type="radio" hidden name="corner" id="sharp" value={c3d.CornerForm.sharp} checked={smoothCorner === c3d.CornerForm.sharp} onClick={this.onChange}></input>
                            <label for="sharp">Sharp</label>
                        </div>
                    </li>
                    <li>
                        <label for="prolong">Selection
                            <plasticity-tooltip><img src={prolong_} /></plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <input type="checkbox" hidden id="prolong" name="prolong" checked={prolong} onClick={this.onChange}></input>
                            <label for="prolong">Add tangent edges</label>
                        </div>
                    </li>
                    <li>
                        <label for="keepCant">Boundary
                            <plasticity-tooltip><img src={cant1} /><img src={cant2} /><img src={cant3} /></plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <input type="radio" hidden name="keepCant" id="neutral" value={c3d.ThreeStates.neutral} checked={keepCant === c3d.ThreeStates.neutral} onClick={this.onChange}></input>
                            <label for="neutral">Neutral</label>

                            <input type="radio" hidden name="keepCant" id="negative" value={c3d.ThreeStates.negative} checked={keepCant === c3d.ThreeStates.negative} onClick={this.onChange}></input>
                            <label for="negative">Negative</label>

                            <input type="radio" hidden name="keepCant" id="positive" value={c3d.ThreeStates.positive} checked={keepCant === c3d.ThreeStates.positive} onClick={this.onChange}></input>
                            <label for="positive">Positive</label>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-fillet-dialog', FilletDialog);
