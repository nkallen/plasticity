import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ThinSolidParams } from "./ThinSolidFactory";

export class ThinSolidDialog extends AbstractDialog<ThinSolidParams> {
    constructor(protected readonly params: ThinSolidParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        let { thickness1, thickness2 } = this.params;

        render(
            <>
                <h4>Shell</h4>
                <ul>
                    <li>
                        <label for="thickness1">Distance 1 </label>
                        <ispace-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="thickness2">Distance 2</label>
                        <ispace-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul></>, this);
    }
}
customElements.define('ispace-thin-solid-dialog', ThinSolidDialog);
