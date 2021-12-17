import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { BooleanParams } from "./BooleanFactory";
import { CutParams } from "./CutFactory";
import c3d from '../../../build/Release/c3d.node';

export class BooleanDialog extends AbstractDialog<BooleanParams> {
    constructor(protected readonly params: BooleanParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { mergingFaces, mergingEdges, operationType } = this.params;
        render(
            <>
                <h4>Boolean {c3d.OperationType[operationType]}</h4>
                <ul>
                    <li>
                        <label for="mergingFaces">mergingFaces</label>
                        <input type="checkbox" name="mergingFaces" checked={mergingFaces} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="mergingEdges">mergingEdges</label>
                        <input type="checkbox" name="mergingEdges" checked={mergingEdges} onClick={this.onChange}></input>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('boolean-dialog', BooleanDialog);

export class CutDialog extends AbstractDialog<CutParams> {
    constructor(protected readonly params: CutParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { mergingFaces, mergingEdges } = this.params;
        render(
            <>
                <h4>Cut</h4>
                <ul>
                    <li>
                        <label for="mergingFaces">mergingFaces</label>
                        <input type="checkbox" name="mergingFaces" checked={mergingFaces} onClick={this.onChange}></input>
                    </li>
                    <li>
                        <label for="mergingEdges">mergingEdges</label>
                        <input type="checkbox" name="mergingEdges" checked={mergingEdges} onClick={this.onChange}></input>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('cut-dialog', CutDialog);
