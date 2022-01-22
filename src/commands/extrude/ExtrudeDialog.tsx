import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ExtrudeParams } from './ExtrudeFactory';

export class ExtrudeDialog extends AbstractDialog<ExtrudeParams> {
    name = "Extrude";

    constructor(protected readonly params: ExtrudeParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance1, distance2, race1, race2, thickness1, thickness2 } = this.params;

        render(
            <>
                <ol>
                    <plasticity-prompt name="Select target bodies" description="to cut or join into"></plasticity-prompt>
                </ol>

                <ul>
                    <li>
                        <label for="distance">Distance</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label>Race (angle)</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="race1" value={race1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="race2" value={race2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label>Thickness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('extrude-dialog', ExtrudeDialog);
