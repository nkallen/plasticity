import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { MoveParams } from "./TranslateFactory";

export class MoveDialog extends AbstractDialog<MoveParams> {
    title = "Move";

    constructor(protected readonly params: MoveParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { move } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="move.x">X</label>
                        <plasticity-number-scrubber name="move.x" value={move.x} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="move.y">Y</label>
                        <plasticity-number-scrubber name="move.y" value={move.y} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="move.z">Z</label>
                        <plasticity-number-scrubber name="move.z" value={move.z} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('move-dialog', MoveDialog);
