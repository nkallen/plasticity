import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { EditorSignals } from "../editor/EditorSignals";
import { DatabaseLike } from "../editor/GeometryDatabase";
import MaterialDatabase from "../editor/MaterialDatabase";
import * as visual from '../editor/VisualModel';
import matcap from '../img/matcap/ceramic_dark.exr';
import { HasSelectedAndHovered, HasSelection } from "./SelectionManager";

type Materials = { line: LineMaterial, face: THREE.MeshMatcapMaterial, region: THREE.MeshBasicMaterial, controlPoint: THREE.Color };

export class HighlightManager {
    constructor(
        private readonly db: DatabaseLike,
        private readonly materials: MaterialDatabase,
        private readonly selection: HasSelectedAndHovered,
        private readonly signals: EditorSignals,
    ) {
        signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution));
    }

    highlightSelected() {
        this.highlight(this.selection.selected,
            { line: line_highlighted, face: face_highlighted, region: region_highlighted, controlPoint: controlPoint_highlighted })
    }

    highlightHovered() {
        this.highlight(this.selection.hovered,
            { line: line_hovered, face: face_hovered, region: region_hovered, controlPoint: controlPoint_hovered })
    }

    unhighlightSelected() {
        this.unhighlight(this.selection.selected);
    }

    unhighlightHovered() {
        this.unhighlight(this.selection.hovered);
    }

    private highlight(selection: HasSelection, materials: Materials) {
        const { db } = this;
        const { edgeIds, faceIds, curveIds, regionIds, controlPointIds } = selection;

        for (const id of edgeIds) {
            const { views } = db.lookupTopologyItemById(id);
            for (const view of views) {
                const edge = view as visual.CurveEdge;
                edge.child.userData.oldMaterial = edge.child.material;
                edge.child.material = materials.line;
            }
        }
        for (const id of faceIds) {
            const { views } = db.lookupTopologyItemById(id);
            for (const view of views) {
                const face = view as visual.Face;
                face.child.userData.oldMaterial = face.child.material;
                face.child.material = materials.face;
            }
        }
        for (const id of curveIds) {
            const { view } = db.lookupItemById(id);
            const instance = view as visual.SpaceInstance<visual.Curve3D>;
            for (const level of instance.levels) {
                for (const segment of level.segments) {
                    segment.line.userData.oldMaterial = segment.line.material;
                    segment.line.material = materials.line;
                }
            }
        }
        for (const id of regionIds) {
            const { view } = db.lookupItemById(id);
            const instance = view as visual.PlaneInstance<visual.Region>;
            for (const region of instance.levels) {
                region.child.userData.oldMaterial = region.child.material;
                region.child.material = materials.region;
            }
        }
        for (const id of controlPointIds) {
            const { views } = this.db.lookupControlPointById(id);
            for (const v of views) {
                const newColor = controlPoint_highlighted;
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

    private unhighlight(selection: HasSelection) {
        const { db } = this;
        const { edgeIds, faceIds, curveIds, regionIds, controlPointIds } = selection;

        for (const id of edgeIds) {
            const { views } = db.lookupTopologyItemById(id);
            for (const view of views) {
                const edge = view as visual.CurveEdge;
                edge.child.material = edge.child.userData.oldMaterial;
                delete edge.child.userData.oldMaterial;
            }
        }
        for (const id of faceIds) {
            const { views } = db.lookupTopologyItemById(id);
            for (const view of views) {
                const face = view as visual.Face;
                face.child.material = face.child.userData.oldMaterial;
                delete face.child.userData.oldMaterial;
            }
        }
        for (const id of curveIds) {
            const { view } = db.lookupItemById(id);
            const instance = view as visual.SpaceInstance<visual.Curve3D>;
            for (const level of instance.levels) {
                for (const segment of level.segments) {
                    segment.line.material = segment.line.userData.oldMaterial;
                    delete segment.line.userData.oldMaterial;
                }
            }
        }
        for (const id of regionIds) {
            const { view } = db.lookupItemById(id);
            const instance = view as visual.PlaneInstance<visual.Region>;
            for (const region of instance.levels) {
                region.child.material = region.child.userData.oldMaterial;
                delete region.child.userData.oldMaterial;
            }
        }
        for (const id of controlPointIds) {
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

    private readonly lines = [line_highlighted, line_hovered];

    setResolution(size: THREE.Vector2) {
        for (const material of this.lines) {
            material.resolution.copy(size);
        }
    }

    get outlineSelection() { return this.selection.selected.solids }
    get outlineHover() { return this.selection.hovered.solids }

}

    // highlight(highlighter: HighlightManager): void {
    //     for (const [key, { premodified }] of this.name2stack.entries()) {
    //         premodified.traverse(child => {
    //             if (child instanceof THREE.Mesh && !(child instanceof Line2)) {
    //                 child.userData.originalMaterial = child.material;
    //                 child.material = invisible;
    //             }
    //         })
    //     }
    //     this.selection.highlight(highlighter);
    // }

    // unhighlight(highlighter: HighlightManager): void {
    //     for (const [key, { premodified }] of this.name2stack.entries()) {
    //         premodified.traverse(child => {
    //             if (child instanceof THREE.Mesh && !(child instanceof Line2)) {
    //                 child.material = child.userData.originalMaterial;
    //                 delete child.userData.originalMaterial;
    //             }
    //         })
    //     }
    //     this.selection.unhighlight(highlighter);
    // }

    // get outlinable() {
    //     const { db, modifiers } = this;
    //     const outlineIds = new Set(this.solidIds);
    //     for (const id of outlineIds) {
    //         const state = this.stateOf(id);
    //         if (state === 'premodified') {
    //             const stack = modifiers.getByPremodified(id)!;
    //             outlineIds.delete(id);
    //             outlineIds.add(stack.modified.simpleName);
    //         }
    //     }
    //     return new ItemSelection<visual.Solid>(db, outlineIds)
    // }

const line_highlighted = new LineMaterial({ color: 0xffff00, linewidth: 2 });
line_highlighted.depthFunc = THREE.AlwaysDepth;

const line_hovered = new LineMaterial({ color: 0xffffff, linewidth: 2 });
line_hovered.depthFunc = THREE.AlwaysDepth;

// @ts-expect-error
const matcapTexture = new EXRLoader().load(matcap);

const face_highlighted = new THREE.MeshMatcapMaterial();
face_highlighted.color.setHex(0xffff00).convertGammaToLinear();
face_highlighted.fog = false;
face_highlighted.matcap = matcapTexture;
face_highlighted.polygonOffset = true;
face_highlighted.polygonOffsetFactor = -1;
face_highlighted.polygonOffsetUnits = -1;

const face_hovered = new THREE.MeshMatcapMaterial();
face_hovered.color.setHex(0xffffcc).convertGammaToLinear();
face_hovered.fog = false;
face_hovered.matcap = matcapTexture;
face_hovered.polygonOffset = true;
face_hovered.polygonOffsetFactor = -1;
face_hovered.polygonOffsetUnits = -1;

const region_hovered = new THREE.MeshBasicMaterial();
region_hovered.fog = false;
region_hovered.color.setHex(0x8dd9f2).convertGammaToLinear();
region_hovered.opacity = 0.5;
region_hovered.transparent = true;
region_hovered.side = THREE.DoubleSide;

const region_highlighted = new THREE.MeshBasicMaterial();
region_highlighted.fog = false;
region_highlighted.color.setHex(0x8dd9f2).convertGammaToLinear();
region_highlighted.opacity = 0.9;
region_highlighted.transparent = true;
region_highlighted.side = THREE.DoubleSide;

const controlPoint_hovered = new THREE.Color(0xffff88);
const controlPoint_highlighted = new THREE.Color(0xffff00);
