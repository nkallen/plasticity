import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { CommandKeyboardInput } from '../CommandKeyboardInput';
import { MoveParams } from "./TranslateFactory";

export class MoveDialog extends AbstractDialog<MoveParams> {
    constructor(protected readonly params: MoveParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { move } = this.params;

        render(
            <>
                <h4>Move</h4>
                <ul>
                    <li>
                        <label for="move.x">X</label>
                        <ispace-number-scrubber name="move.x" value={move.x} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="move.y">Y</label>
                        <ispace-number-scrubber name="move.y" value={move.y} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="move.z">Z</label>
                        <ispace-number-scrubber name="move.z" value={move.z} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('move-dialog', MoveDialog);
