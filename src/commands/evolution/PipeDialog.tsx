import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { PipeParams } from './PipeFactory';

export class PipeDialog extends AbstractDialog<PipeParams> {
    name = "Pipe";

    constructor(protected readonly params: PipeParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { vertexCount, sectionSize, thickness1, thickness2, degrees } = this.params;

        render(
            <>
                <ol>
                <plasticity-prompt name="Select target bodies" description="to cut or join into"></plasticity-prompt>
                {/* <plasticity-prompt name="Select custom profile" description="to sweep along"></plasticity-prompt> */}
                </ol>

                <ul>
                    <li>
                        <label for="vertexCount">
                            Vertex count
                            <plasticity-tooltip>Change this number to change the profile curve. 0 is circle, 3 is triangle, 6 is hexagon, etc.</plasticity-tooltip>
                        </label>
                        <div class="fields">
                            <plasticity-number-scrubber precision={1} name="vertexCount" value={vertexCount} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="sectionSize">Section size</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="sectionSize" value={sectionSize} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="thickness1">Thickness 1 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="thickness2">Thickness 1 </label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="degrees">Angle</label>
                        <div class="fields">
                            <plasticity-number-scrubber precision={1} name="degrees" value={degrees} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-pipe-dialog', PipeDialog);
