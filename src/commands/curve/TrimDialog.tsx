import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";

export class TrimDialog extends AbstractDialog<{}> {
    name = "Trim";

    constructor(protected readonly params: {}, signals: EditorSignals) {
        super(signals);
    }

    render() {
        render(
            <>
                <ol>
                    <plasticity-prompt name="Select curve segments" description="to trim away"></plasticity-prompt>
                </ol>
            </>, this);
    }
}
customElements.define('trim-dialog', TrimDialog);