import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditRectangleParams } from './RectangleFactory';

export class RectangleDialog extends AbstractDialog<EditRectangleParams> {
    name = "Rectangle";

    constructor(protected readonly params: EditRectangleParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { width, length } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="width">Width</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="width" value={width} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>

                    <li>
                        <label for="length">Length</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="length" value={length} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>

                </ul>
            </>, this);
    }
}
customElements.define('plasticity-rectangle-dialog', RectangleDialog);
