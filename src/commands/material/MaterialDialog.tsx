import { render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { MaterialParams } from './SetMaterialCommand';

export class MaterialDialog extends AbstractDialog<MaterialParams> {
    readonly name = "Material";

    constructor(protected readonly params: MaterialParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { color, metalness, roughness, ior, clearcoat, clearcoatRoughness, sheen, sheenRoughness, sheenColor, transmission, thickness, specularIntensity, specularColor } = this.params;

        render(
            <>
                <ul>
                    <li>
                        <label for="color">Color</label>
                        <div class="fields">
                            <input type="color" name="color" value={`#${color.getHexString()}`} onInput={this.onChange}></input>
                        </div>
                    </li>
                    <li>
                        <label for="metalness">Metalness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="metalness" value={metalness} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="roughness">Roughness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="roughness" value={roughness} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="ior">IOR</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="ior" value={ior} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="clearcoat">Clearcoat</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="clearcoat" value={clearcoat} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="clearcoatRoughness">Clearcoat Roughness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="clearcoatRoughness" value={clearcoatRoughness} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="sheen">Sheen</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="sheen" value={sheen} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="sheenRoughness">Sheen roughness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="sheenRoughness" value={sheenRoughness} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="sheenColor">Sheen color</label>
                        <div class="fields">
                            <input type="color" name="sheenColor" value={`#${sheenColor.getHexString()}`} onInput={this.onChange}></input>
                        </div>
                    </li>
                    <li>
                        <label for="specularIntensity">Specular intensity</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="specularIntensity" value={specularIntensity} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="specularColor">Specular color</label>
                        <div class="fields">
                            <input type="color" name="specularColor" value={`#${specularColor.getHexString()}`} onInput={this.onChange}></input>
                        </div>
                    </li>
                    <li>
                        <label for="transmission">Transmission</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="transmission" value={transmission} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                    <li>
                        <label for="thickness">Thickness</label>
                        <div class="fields">
                            <plasticity-number-scrubber name="thickness" value={thickness} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                        </div>
                    </li>
                </ul></>, this);
    }
}
customElements.define('plasticity-material-dialog', MaterialDialog);
