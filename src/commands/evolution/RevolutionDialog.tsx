import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import RevolutionFactory, { RevolutionParams } from "./RevolutionFactory";
import c3d from '../../../build/Release/c3d.node';

export class RevolutionDialog extends AbstractDialog<RevolutionParams> {
    constructor(protected readonly params: RevolutionParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { thickness1, thickness2, side1, side2 } = this.params;

        render(
            <>
                <h4>Revolution</h4>
                <ul>
                    <li>
                        <label for="thickness1">Distance 1
                        </label>
                        <ispace-number-scrubber name="thickness1" value={thickness1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="thickness2">Thickness 1
                        </label>
                        <ispace-number-scrubber name="thickness2" value={thickness2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="side">Side 1
                        </label>
                        <ispace-number-scrubber name="side1" value={side1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="side2">Side 2
                        </label>
                        <ispace-number-scrubber name="side2" value={side2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>

                </ul></>, this);
    }
}
customElements.define('ispace-revolution-dialog', RevolutionDialog);
