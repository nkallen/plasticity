import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { MoveParams } from "./TranslateItemFactory";

export class MoveDialog extends AbstractDialog<MoveParams> {
    name = "Move";

    constructor(protected readonly params: MoveParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { move } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="move">XYZ</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="move.x" value={move.x} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="move.y" value={move.y} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="move.z" value={move.z} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('move-dialog', MoveDialog);
