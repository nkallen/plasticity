import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { LoftParams } from "./LoftFactory";


export class LoftDialog extends AbstractDialog<LoftParams> {
    name = "Loft";

    constructor(protected readonly params: LoftParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { thickness1, thickness2 } = this.params;
        
        render(
            <>
                <ol>
                    <plasticity-prompt name="Select spine" description="to loft along"></plasticity-prompt>
                </ol>

                <ul>
                    <li>
                        <label>Thickness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                            <plasticity-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul>
            </>, this);
    }
}

customElements.define('loft-dialog', LoftDialog);
