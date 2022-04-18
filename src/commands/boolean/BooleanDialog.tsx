import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { BooleanParams } from "./BooleanFactory";

export class BooleanDialog extends AbstractDialog<BooleanParams> {
    name = "Boolean";

    constructor(protected readonly params: BooleanParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { mergingFaces, mergingEdges, keepTools } = this.params;
        render(
            <>
                <ol>
                    <plasticity-prompt name="Select target bodies" description="to cut or join into"></plasticity-prompt>
                    <plasticity-prompt name="Select tool bodies" description="to cut or join with"></plasticity-prompt>
                </ol>

                <ul>
                    <li>
                        <label for="mergingFaces">Merge</label>
                        <div class="fields">
                            <input type="checkbox" hidden id="mergingFaces" name="mergingFaces" checked={mergingFaces} onClick={this.onChange}></input>
                            <label for="mergingFaces">Coplanar faces</label>
                            <input type="checkbox" hidden id="mergingEdges" name="mergingEdges" checked={mergingEdges} onClick={this.onChange}></input>
                            <label for="mergingEdges">Tangent edges</label>
                        </div>
                    </li>

                    <li>
                        <label for="keepTools">Merge</label>
                        <div class="fields">
                            <input type="checkbox" hidden id="keepTools" name="keepTools" checked={keepTools} onClick={this.onChange}></input>
                            <label for="keepTools">Keep Tools</label>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('boolean-dialog', BooleanDialog);

