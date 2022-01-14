import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditCircleParams } from './CircleFactory';

export class EditCircleDialog extends AbstractDialog<EditCircleParams> {
    title = "Circle";

    constructor(protected readonly params: EditCircleParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { radius } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="radius">Radius</label>
                        <plasticity-number-scrubber name="radius" value={radius} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                </ul>
                </>, this);
    }
}
customElements.define('plasticity-center-circle-dialog', EditCircleDialog);
