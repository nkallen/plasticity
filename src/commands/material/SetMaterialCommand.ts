import * as THREE from "three";
import * as cmd from "../../command/Command";
import { Empty, ImageEmpty } from "../../editor/Empties";
import { defaultPhysicalMaterial } from "../../visual_model/RenderedSceneBuilder";
import { MaterialDialog } from "./MaterialDialog";

export interface MaterialParams {
    color: THREE.Color;
}

export interface PhysicalMaterialParams extends MaterialParams {
    metalness: number;
    roughness: number;
    ior: number;
    clearcoat: number;
    clearcoatRoughness: number;
    sheen: number;
    sheenRoughness: number;
    sheenColor: THREE.Color;
    specularIntensity: number;
    specularColor: THREE.Color;
    transmission: number;
    thickness: number;
}

export class SetMaterialCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { editor: { scene, selection: { selected }, materials, signals } } = this;
        const node = selected.solids.first ?? selected.groups.first ?? selected.empties.first;
        let material = scene.getMaterial(node);
        if (material === undefined) {
            if (node instanceof Empty) {
                material = defaultImageEmptyMaterial.clone();
                const id = materials.add("New material", material);
                for (const empty of [...selected.empties]) {
                    scene.setMaterial(empty, id);
                }
            } else {
                material = defaultPhysicalMaterial.clone();
                const id = materials.add("New material", material);
                for (const solid of [...selected.solids, ...selected.groups]) {
                    scene.setMaterial(solid, id);
                }
            }
        }

        const dialog = new MaterialDialog(material, signals);
        dialog.execute(() => {
            signals.factoryUpdated.dispatch();
            for (const empty of [...selected.empties]) {
                if (empty instanceof ImageEmpty) {
                    const existing = empty.plane.material as THREE.MeshBasicMaterial;
                    existing.depthWrite = material!.depthFunc !== THREE.NeverDepth; 
                    existing.depthTest = true;
                    existing.depthFunc = material!.depthFunc;
                    existing.opacity = material!.opacity;
                    existing.transparent = material!.opacity < 1;
                }
            }
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await this.finished;
    }
}

export class RemoveMaterialCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { editor: { scene, selection: { selected } } } = this;
        const node = selected.solids.first ?? selected.groups.first;
        scene.setMaterial(node, undefined);
    }
}

const defaultImageEmptyMaterial = new THREE.MeshBasicMaterial();