import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import c3d from '../../build/Release/c3d.node';
import { GeometryDatabase } from "../editor/GeometryDatabase";

export class HighlightManager {
    constructor(
        private readonly db: GeometryDatabase
    ) { }

    highlightTopologyItems(collection: Iterable<string>, mat: (c: c3d.TopologyItem) => THREE.Material) {
        for (const id of collection) {
            const { views, model } = this.db.lookupTopologyItemById(id);
            const newMaterial = mat(model);
            for (const v of views) {
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
            const { views } = this.db.lookupTopologyItemById(id);
            for (const v of views) {
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
            const { view, model } = this.db.lookupItemById(id);
            if (!(model instanceof c3d.PlaneInstance || model instanceof c3d.SpaceInstance)) throw new Error("invalid precondition");

            const newMaterial = mat(model);
            view.traverse(o => {
                if (o instanceof Line2 || o instanceof THREE.Mesh) {
                    if (o.userData.oldMaterial == undefined)
                        o.userData.oldMaterial = o.material;
                    o.material = newMaterial;
                }
            })
        }
    }

    unhighlightItems(collection: Iterable<c3d.SimpleName>) {
        for (const id of collection) {
            const { view, model } = this.db.lookupItemById(id);
            if (!(model instanceof c3d.PlaneInstance || model instanceof c3d.SpaceInstance)) throw new Error("invalid precondition");

            view.traverse(o => {
                if (o instanceof Line2 || o instanceof THREE.Mesh) {
                    if (o.userData.oldMaterial !== undefined)
                        o.material = o.userData.oldMaterial;
                    delete o.userData.oldMaterial;
                } else if (o instanceof THREE.Sprite) {
                    o.visible = false;
                }
            })
        }
    }

    highlightControlPoints(collection: Iterable<string>, mat: (c: number) => THREE.Color) {
        for (const id of collection) {
            const { index, views } = this.db.lookupControlPointById(id);
            for (const v of views) {
                const newColor = mat(index);
                const points = v.geometry;
                if (points === undefined) continue;
                const geometry = points.geometry;
                const color = geometry.attributes.color;
                const array = color.array as unknown as Float32Array;
                array[v.index * 3 + 0] = newColor.r;
                array[v.index * 3 + 1] = newColor.g;
                array[v.index * 3 + 2] = newColor.b;
                geometry.attributes.color.needsUpdate = true;
            }
        }
    }

    unhighlightControlPoints(collection: Iterable<string>) {
        for (const id of collection) {
            const { views } = this.db.lookupControlPointById(id);
            for (const v of views) {
                const newColor = new THREE.Color(0xffffff);
                const points = v.geometry;
                if (points === undefined) continue;
                const geometry = points.geometry;
                const color = geometry.attributes.color;
                const array = color.array as unknown as Float32Array;
                array[v.index * 3 + 0] = newColor.r;
                array[v.index * 3 + 1] = newColor.g;
                array[v.index * 3 + 2] = newColor.b;
                geometry.attributes.color.needsUpdate = true;
            }
        }
    }
}