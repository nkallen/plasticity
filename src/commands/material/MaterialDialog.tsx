import { render } from 'preact';
import * as THREE from "three";
import { AbstractDialog } from "../../command/AbstractDialog";
import { EditorSignals } from "../../editor/EditorSignals";
import { MaterialParams } from './SetMaterialCommand';

export class MaterialDialog extends AbstractDialog<MaterialParams> {
    readonly name = "Material";

    constructor(protected readonly params: MaterialParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const params = this.params;
        if (params instanceof THREE.MeshPhysicalMaterial) {
            this.renderPhysical(params);
        } else if (params instanceof THREE.MeshBasicMaterial) {
            this.renderBasic(params);
        } else {
            throw new Error("not yet supported");
        }
    }

    private renderPhysical(params: THREE.MeshPhysicalMaterial) {
        const { color, metalness, roughness, ior, clearcoat, clearcoatRoughness, sheen, sheenRoughness, sheenColor, transmission, thickness, specularIntensity, specularColor, opacity } = params;

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

    private renderBasic(params: THREE.MeshBasicMaterial) {
        const { opacity, depthFunc } = params;

        render(<>
            <ul>
                <li>
                    <label for="depthFunc">Depth
                    </label>
                    <div class="fields">
                        <input type="radio" hidden name="depthFunc" id="normal" value={THREE.LessEqualDepth} checked={depthFunc === THREE.LessEqualDepth} onClick={this.onChange}></input>
                        <label for="normal">Normal</label>

                        <input type="radio" hidden name="depthFunc" id="always" value={THREE.AlwaysDepth} checked={depthFunc === THREE.AlwaysDepth} onClick={this.onChange}></input>
                        <label for="always">Front</label>

                        <input type="radio" hidden name="depthFunc" id="never" value={THREE.NeverDepth} checked={depthFunc === THREE.NeverDepth} onClick={this.onChange}></input>
                        <label for="never">Behind</label>
                    </div>
                </li>
                <li>
                    <label for="opacity">Opacity</label>
                    <div class="fields">
                        <plasticity-number-scrubber name="opacity" disabled={1.0} default={0.5} min={0} max={1} value={opacity} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></plasticity-number-scrubber>
                    </div>
                </li>
            </ul>
        </>, this);
    }
}
customElements.define('plasticity-material-dialog', MaterialDialog);
