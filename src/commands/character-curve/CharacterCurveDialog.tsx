import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { CharacterCurveParams } from './CharacterCurveFactory';

export class CharacterCurveDialog extends AbstractDialog<CharacterCurveParams> {
    title = "Character curve";

    constructor(protected readonly params: CharacterCurveParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { tMin, tMax, argument, xFunction, yFunction, zFunction } = this.params;
        render(
            <ul>
                <li>
                    <label for="tMin">tMin</label>
                    <div class="fields">
                        <plasticity-number-scrubber name="tMin" value={tMin} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </div>
                </li>
                <li>
                    <label for="tMax">tMax</label>
                    <div class="fields">
                        <plasticity-number-scrubber name="tMax" value={tMax} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </div>
                </li>
                <li>
                    <label for="argument">Argument name</label>
                    <div class="fields">
                        <input type="text" name="argument" value={argument} onChange={this.onChange} />
                    </div>
                </li>
                <li>
                    <label for="xFunction">xFunction</label>
                    <div class="fields">
                        <input type="text" name="xFunction" value={xFunction} onChange={this.onChange} />
                    </div>
                </li>
                <li>
                    <label for="yFunction">yFunction</label>
                    <div class="fields">
                        <input type="text" name="yFunction" value={yFunction} onChange={this.onChange} />
                    </div>
                </li>
                <li>
                    <label for="zFunction">zFunction</label>
                    <div class="fields">
                        <input type="text" name="zFunction" value={zFunction} onChange={this.onChange} />
                    </div>
                </li>
            </ul>, this);
    }
}
customElements.define('character-curve-dialog', CharacterCurveDialog);
