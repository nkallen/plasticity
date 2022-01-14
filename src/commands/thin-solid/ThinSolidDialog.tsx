import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ThinSolidParams } from "./ThinSolidFactory";

export class ThinSolidDialog extends AbstractDialog<ThinSolidParams> {
    title = "Thin solid";

    constructor(protected readonly params: ThinSolidParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        let { thickness1, thickness2 } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label>Thickness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-thin-solid-dialog', ThinSolidDialog);
