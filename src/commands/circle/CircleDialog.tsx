import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditCircleParams } from './CircleFactory';

export class EditCircleDialog extends AbstractDialog<EditCircleParams> {
    constructor(protected readonly params: EditCircleParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { radius } = this.params;

        render(
            <>
                <h4>Circle</h4>
                <ul>
                    <li>
                        <label for="radius">Radius</label>
                        <ispace-number-scrubber name="radius" value={radius} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul>
                </>, this);
    }
}
customElements.define('ispace-center-circle-dialog', EditCircleDialog);
