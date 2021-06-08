import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import * as visual from '../VisualModel';
import c3d from '../../build/Release/c3d.node';
import { GeometryDatabase } from "../GeometryDatabase";

export class HighlightManager {
    constructor(
        private readonly db: GeometryDatabase
    ) { }

    highlightTopologyItems(collection: Iterable<string>, mat: (c: c3d.TopologyItem) => THREE.Material) {
        for (const id of collection) {
            const { visual, model } = this.db.lookupTopologyItemById(id);
            const newMaterial = mat(model);
            for (const v of visual) {
                v.traverse(o => {
                    if (o instanceof Line2 || o instanceof THREE.Mesh) {
                        o.userData.oldMaterial = o.material;
                        o.material = newMaterial;
                    }
                })
            }
        }
    }

    unhighlightTopologyItems(collection: Iterable<string>) {
        for (const id of collection) {
            const { visual } = this.db.lookupTopologyItemById(id);
            for (const v of visual) {
                v.traverse(o => {
                    if (o instanceof Line2 || o instanceof THREE.Mesh) {
                        o.material = o.userData.oldMaterial;
                        delete o.userData.oldMaterial;
                    }
                })
            }
        }
    }

    highlightItems(collection: Iterable<c3d.SimpleName>, mat: (c: c3d.Item) => THREE.Material) {
        for (const id of collection) {
            const { visual: v, model } = this.db.lookupItemById(id);
            if (!(model instanceof c3d.PlaneInstance || model instanceof c3d.SpaceInstance)) throw new Error("invalid precondition");
            const newMaterial = mat(model);
            v.traverse(o => {
                if (o instanceof Line2 || o instanceof THREE.Mesh) {
                    o.userData.oldMaterial = o.material;
                    o.material = newMaterial;
                }
            })
        }
    }

    unhighlightItems(collection: Iterable<c3d.SimpleName>) {
        for (const id of collection) {
            const { visual: v, model } = this.db.lookupItemById(id);
            if (!(model instanceof visual.PlaneInstance || model instanceof visual.SpaceInstance)) throw new Error("invalid precondition");
            v.traverse(o => {
                if (o instanceof Line2 || o instanceof THREE.Mesh) {
                    o.material = o.userData.oldMaterial;
                    delete o.userData.oldMaterial;
                }
            })
        }
    }
}