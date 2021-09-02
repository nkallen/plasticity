import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { EditorSignals } from "../editor/EditorSignals";
import { DatabaseLike } from "../editor/GeometryDatabase";
import MaterialDatabase from "../editor/MaterialDatabase";
import ModifierManager from "../editor/ModifierManager";
import * as visual from '../editor/VisualModel';
import matcap from '../img/matcap/ceramic_dark.exr';
import { ItemSelection } from "./Selection";
import { HasSelectedAndHovered } from "./SelectionManager";

export class HighlightManager {
    constructor(
        protected readonly db: DatabaseLike,
        protected readonly materials: MaterialDatabase,
        protected readonly selection: HasSelectedAndHovered,
        protected readonly signals: EditorSignals,
    ) {
        signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution));
        signals.commandEnded.add(() => this.highlight());
        signals.modifiersLoaded.add(() => this.highlight());
        signals.objectHovered.add(selectable => this.hover(selectable));
        signals.objectUnhovered.add(selectable => this.unhover(selectable));
    }

    hover(item: visual.Selectable) {
        performance.mark('begin-hover');
        if (item instanceof visual.SpaceInstance) {
            for (const level of item.levels) {
                const curve = level as visual.Curve3D;
                for (const segment of curve.segments) {
                    segment.line.material = line_hovered;
                }
            }
        } else if (item instanceof visual.Face) {
            const { views } = this.db.lookupTopologyItemById(item.simpleName);
            for (const view of views) {
                const face = view as visual.Face;
                if (face.child.userData.oldMaterial === undefined)
                    face.child.userData.oldMaterial = face.child.material;
                face.child.material = face_hovered;
            }
        } else if (item instanceof visual.CurveEdge) {
            const { views } = this.db.lookupTopologyItemById(item.simpleName);
            for (const view of views) {
                const edge = view as visual.Face;
                if (edge.child.userData.oldMaterial === undefined)
                    edge.child.userData.oldMaterial = edge.child.material;
                edge.child.material = line_hovered;
            }
        } else if (item instanceof visual.PlaneInstance) {
            for (const level of item.levels) {
                const region = level as visual.Region;
                region.child.material = region_hovered;
            }
        } else if (item instanceof visual.ControlPoint) {
        }
        performance.measure('hover', 'begin-hover');
    }

    unhover(item: visual.Selectable) {
        performance.mark('begin-unhover');
        if (item instanceof visual.SpaceInstance) {
            this.highlightCurve(item);
        } else if (item instanceof visual.Face) {
            const { views } = this.db.lookupTopologyItemById(item.simpleName);
            for (const topo of views) {
                const face = topo as visual.Face;
                if (face.child.userData.oldMaterial !== undefined) {
                    face.child.material = face.child.userData.oldMaterial;
                    delete face.child.userData.oldMaterial;
                }
            }
        } else if (item instanceof visual.CurveEdge) {
            const { views } = this.db.lookupTopologyItemById(item.simpleName);
            for (const view of views) {
                const edge = view as visual.CurveEdge;
                if (edge.child.userData.oldMaterial !== undefined) {
                    edge.child.material = edge.child.userData.oldMaterial;
                    delete edge.child.userData.oldMaterial;
                }
            }
        } else if (item instanceof visual.PlaneInstance) {
            this.highlightRegion(item);
        } else if (item instanceof visual.ControlPoint) {
        }
        performance.measure('unhover', 'begin-unhover');
    }

    highlight() {
        performance.mark('begin-highlight');
        for (const item of this.db.visibleObjects) {
            if (item instanceof visual.Solid) {
                this.highlightSolid(item);
            } else if (item instanceof visual.SpaceInstance) {
                this.highlightCurve(item);
            } else if (item instanceof visual.PlaneInstance) {
                this.highlightRegion(item);
            }
        }
        performance.measure('highlight', 'begin-highlight');
    }

    private readonly lines = [line_unhighlighted, line_highlighted, line_hovered];

    private highlightSolid(item: visual.Solid) {
        for (const face of item.allFaces) {
            this.highlightFace(face);
        }
        for (const edge of item.allEdges) {
            this.highlightEdge(edge);
        }
    }

    private highlightRegion(item: visual.PlaneInstance<visual.Region>) {
        const { selected, hovered } = this.selection;
        for (const level of item.levels) {
            const region = level as visual.Region;
            if (selected.regionIds.has(region.simpleName)) {
                region.child.material = region_highlighted;
            } else {
                region.child.material = region_unhighlighted;
            }
            if (hovered.regionIds.has(region.simpleName)) {
                region.child.material = region_hovered;
            }
        }
    }

    private highlightCurve(item: visual.SpaceInstance<visual.Curve3D>) {
        const { selected, hovered } = this.selection;
        for (const level of item.levels) {
            const curve = level as visual.Curve3D;

            if (selected.curveIds.has(item.simpleName)) {
                for (const segment of curve.segments) {
                    segment.line.material = line_highlighted;
                }
            } else {
                for (const segment of curve.segments) {
                    segment.line.material = line_unhighlighted;
                }
            }
        }
    }

    private highlightEdge(edge: visual.CurveEdge) {
        const { selected, hovered } = this.selection;

        if (selected.edgeIds.has(edge.simpleName)) {
            edge.child.material = line_highlighted;
        } else {
            edge.child.material = line_unhighlighted;
        }
    }

    private highlightFace(face: visual.Face) {
        const { selected, hovered } = this.selection;

        if (selected.faceIds.has(face.simpleName)) {
            face.child.material = face_highlighted;
        } else {
            face.child.material = face_unhighlighted;
        }
    }

    setResolution(size: THREE.Vector2) {
        for (const material of this.lines) {
            material.resolution.copy(size);
        }
    }

    get outlineSelection() { return this.selection.selected.solids }
    get outlineHover() { return this.selection.hovered.solids }

}

export class ModifierHighlightManager extends HighlightManager {
    constructor(
        private readonly modifiers: ModifierManager,
        db: DatabaseLike,
        materials: MaterialDatabase,
        selection: HasSelectedAndHovered,
        signals: EditorSignals,
    ) {
        super(db, materials, selection, signals);
    }

    highlight() {
        super.highlight();
        performance.mark('begin-modifier-highlight');
        const { modifiers, modifiers: { selected } } = this;
        const { premodifiedIds, modifiedIds } = selected.groupIds;

        for (const { premodified, modified } of modifiers.stacks) {
            // All premodifieds have transparent faces
            for (const face of premodified.allFaces) {
                face.child.material = invisible;
            }

            if (premodifiedIds.has(premodified.simpleName) || selected.hasSelectedChildren(premodified)) {
                // All selected premodifieds have visible edges
                for (const edge of premodified.allEdges) {
                    edge.visible = true;
                }

                // All selected premodifieds are selectable
                premodified.traverse(unmask);
            } else {
                // All unselected premodifieds have invisible edges
                for (const edge of premodified.allEdges) {
                    edge.visible = false;
                }
                // All unselected premodifieds are unselectable
                premodified.traverse(mask);
            }

            if (modifiedIds.has(modified.simpleName)) {
                // All selected modifieds have invisible edges
                for (const edge of modified.allEdges) {
                    edge.visible = false;
                }

                // All selected modifieds have unselectable topo items
                modified.traverse(mask);
            } else {
                // All unselected modifieds have visible edges
                for (const edge of modified.allEdges) {
                    edge.visible = true;
                }

                // All unselected modifieds have selectable topo items
                modified.traverse(unmask);
            }
        }
        performance.measure('modifier-highlight', 'begin-modifier-highlight');
    }

    get outlineSelection() {
        const { db, modifiers } = this;
        const { unmodifiedIds, modifiedIds } = modifiers.selected.groupIds;

        return new ItemSelection<visual.Solid>(db, new Set([...unmodifiedIds, ...modifiedIds]));
    }
}

function mask(child: THREE.Object3D) {
    if (child.userData.oldLayerMask == undefined) {
        child.userData.oldLayerMask = child.layers.mask;
        child.layers.set(visual.Layers.Unselectable);
    }
}

function unmask(child: THREE.Object3D) {
    if (child.userData.oldLayerMask !== undefined) {
        child.layers.mask = child.userData.oldLayerMask;
        delete child.userData.oldLayerMask;
    }
}

const line_unhighlighted = new LineMaterial({ color: 0x000000, linewidth: 1.4 });

const line_highlighted = new LineMaterial({ color: 0xffff00, linewidth: 2 });
line_highlighted.depthFunc = THREE.AlwaysDepth;

const line_hovered = new LineMaterial({ color: 0xffffff, linewidth: 2 });
line_hovered.depthFunc = THREE.AlwaysDepth;

// @ts-expect-error
const matcapTexture = new EXRLoader().load(matcap);

const face_unhighlighted = new THREE.MeshMatcapMaterial();
face_unhighlighted.fog = false;
face_unhighlighted.matcap = matcapTexture;
face_unhighlighted.polygonOffset = true;
face_unhighlighted.polygonOffsetFactor = 1;
face_unhighlighted.polygonOffsetUnits = 1;

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

const region_unhighlighted = new THREE.MeshBasicMaterial();
region_unhighlighted.fog = false;
region_unhighlighted.color.setHex(0x8dd9f2).convertGammaToLinear();
region_unhighlighted.opacity = 0.1;
region_unhighlighted.transparent = true;
region_unhighlighted.side = THREE.DoubleSide;

const controlPoint_hovered = new THREE.Color(0xffff88);
const controlPoint_highlighted = new THREE.Color(0xffff00);

const invisible = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
});