import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ExtrudeParams } from './ExtrudeFactory';

export class ExtrudeDialog extends AbstractDialog<ExtrudeParams> {
    title = "Extrude";

    constructor(protected readonly params: ExtrudeParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance1, distance2, race1, race2, thickness1, thickness2 } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="distance1">Distance 1</label>
                        <plasticity-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="distance2">Distance 2</label>
                        <plasticity-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="race1">Race 1</label>
                        <plasticity-number-scrubber name="race1" value={race1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="race2">Race 2</label>
                        <plasticity-number-scrubber name="race2" value={race2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="thickness1">Thickness 1</label>
                        <plasticity-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="thickness2">Thickness 2</label>
                        <plasticity-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('extrude-dialog', ExtrudeDialog);
