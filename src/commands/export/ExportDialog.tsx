import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../AbstractDialog";
import { ExportParams } from "./ExportFactory";

export class ExportDialog extends AbstractDialog<ExportParams> {
    constructor(protected readonly params: ExportParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { sag, angle, length, maxCount } = this.params;

        render(
            <>
                <h4>Export</h4>
                <ul>
                    <li>
                        <label for="sag">
                            Sag
                            <ispace-tooltip>Maximum allowable deviation (in centimeters). Usually this is the only thing you need to change.</ispace-tooltip>
                        </label>
                        <ispace-number-scrubber name="sag" value={sag} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="angle">
                            Angle
                            <ispace-tooltip>Maximum allowable angular deviation (in radians). With this you can add more detail to tight turns over small areas.</ispace-tooltip>
                        </label>
                        <ispace-number-scrubber name="angle" value={angle} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="length">
                            length
                            <ispace-tooltip>Maximum length of any edge. If some edges are too long or stretched, decrease this</ispace-tooltip>
                        </label>
                        <ispace-number-scrubber name="length" value={length} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                    <li>
                        <label for="maxCount">
                            Max Count
                            <ispace-tooltip>Per face, the maximum number of triangulations allowed.</ispace-tooltip>
                        </label>
                        <ispace-number-scrubber name="maxCount" value={maxCount} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('export-dialog', ExportDialog);