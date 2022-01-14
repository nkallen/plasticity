import { render } from 'preact';
import { EditorSignals } from "../../editor/EditorSignals";
import { AbstractDialog } from "../../command/AbstractDialog";
import { ExportParams } from "./ExportFactory";

export class ExportDialog extends AbstractDialog<ExportParams> {
    title = "Export";

    constructor(protected readonly params: ExportParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { sag, angle, length, maxCount } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="sag">
                            Sag
                            <plasticity-tooltip>Maximum allowable deviation (in centimeters). Usually this is the only thing you need to change.</plasticity-tooltip>
                        </label>
                        <plasticity-number-scrubber name="sag" value={sag} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="angle">
                            Angle
                            <plasticity-tooltip>Maximum allowable angular deviation (in radians). With this you can add more detail to tight turns over small areas.</plasticity-tooltip>
                        </label>
                        <plasticity-number-scrubber name="angle" value={angle} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="length">
                            length
                            <plasticity-tooltip>Maximum length of any edge. If some edges are too long or stretched, decrease this</plasticity-tooltip>
                        </label>
                        <plasticity-number-scrubber name="length" value={length} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                    <li>
                        <label for="maxCount">
                            Max Count
                            <plasticity-tooltip>Per face, the maximum number of triangulations allowed.</plasticity-tooltip>
                        </label>
                        <plasticity-number-scrubber name="maxCount" value={maxCount} min={0} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </li>
                </ul>
            </>, this);
    }
}
customElements.define('export-dialog', ExportDialog);