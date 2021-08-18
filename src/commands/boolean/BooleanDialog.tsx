import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { BooleanParams } from "./BooleanFactory";

export class BooleanDialog extends AbstractDialog<BooleanParams> {
    constructor(protected readonly params: BooleanParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { mergingFaces, mergingEdges } = this.params;
        render(
            <ul>
                <li>
                    <label for="mergingFaces">mergingFaces</label>
                    <input type="checkbox" name="mergingFaces" checked={mergingFaces} onClick={this.onChange}></input>
                </li>
                <li>
                    <label for="mergingEdges">mergingEdges</label>
                    <input type="checkbox" name="mergingEdges" checked={mergingEdges} onClick={this.onChange}></input>
                </li>
            </ul>, this);
    }
}
customElements.define('boolean-dialog', BooleanDialog);
