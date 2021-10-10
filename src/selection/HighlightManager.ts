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
import { HasSelectedAndHovered, Selectable } from "./SelectionManager";

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
        signals.historyChanged.add(() => this.highlight());
        signals.objectHovered.add(selectable => this.hover(selectable));
        signals.objectUnhovered.add(selectable => this.unhover(selectable));
    }

    hover(item: Selectable) {
        performance.mark('begin-hover');
        if (item instanceof visual.SpaceInstance) {
            this.hoverCurve(item);
        } else if (item instanceof visual.Face) {
            this.hoverFace(item);
        } else if (item instanceof visual.CurveEdge) {
            this.hoverCurveEdge(item);
        } else if (item instanceof visual.PlaneInstance) {
            this.hoverRegion(item);
        } else if (item instanceof visual.ControlPoint) {
            this.hoverControlPoint(item);
        }
        performance.measure('hover', 'begin-hover');
    }

    private hoverRegion(item: visual.PlaneInstance<any>) {
        for (const level of item.levels) {
            const region = level as visual.Region;
            region.child.material = region_hovered;
        }
    }

    private hoverCurveEdge(item: visual.CurveEdge) {
        const { views } = this.db.lookupTopologyItemById(item.simpleName);
        for (const view of views) {
            const edge = view as visual.Face;
            if (edge.child.userData.oldMaterial === undefined)
                edge.child.userData.oldMaterial = edge.child.material;
            edge.child.material = line_hovered;
        }
    }

    protected hoverFace(item: visual.Face) {
        const { views } = this.db.lookupTopologyItemById(item.simpleName);
        for (const view of views) {
            const face = view as visual.Face;
            face.child.material = face_hovered;
        }
    }

    private hoverCurve(item: visual.SpaceInstance<any>) {
        for (const level of item.levels) {
            const curve = level as visual.Curve3D;
            for (const segment of curve.segments) {
                segment.line.material = line_hovered;
            }
        }
    }

    private hoverControlPoint(v: visual.ControlPoint) {
        const geometry = v.geometry!;
        const colors = geometry.attributes.color;
        const array = colors.array as unknown as Float32Array;
        array[v.index * 3 + 0] = controlPoint_hovered.r;
        array[v.index * 3 + 1] = controlPoint_hovered.g;
        array[v.index * 3 + 2] = controlPoint_hovered.b;
        colors.needsUpdate = true;
    }

    unhover(item: Selectable) {
        performance.mark('begin-unhover');
        if (item instanceof visual.SpaceInstance) {
            this.highlightCurve(item);
        } else if (item instanceof visual.Face) {
            this.unhoverFace(item);
        } else if (item instanceof visual.CurveEdge) {
            const { views } = this.db.lookupTopologyItemById(item.simpleName);
            for (const view of views) {
                this.highlightCurveEdge(view as visual.CurveEdge)
            }
        } else if (item instanceof visual.PlaneInstance) {
            this.highlightRegion(item);
        } else if (item instanceof visual.ControlPoint) {
            this.highlightCurve(item.parentItem);
        }
        performance.measure('unhover', 'begin-unhover');
    }

    protected unhoverFace(item: visual.Face) {
        const { views } = this.db.lookupTopologyItemById(item.simpleName);
        for (const topo of views) {
            const face = topo as visual.Face;
            this.highlightFace(face);
        }
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
            } else throw new Error("invalid type: " + item.constructor.name);
        }
        this.highlightControlPoints();
        performance.measure('highlight', 'begin-highlight');
    }

    private readonly lines = [line_unhighlighted, line_highlighted, line_hovered];

    private highlightSolid(solid: visual.Solid) {
        for (const face of solid.allFaces) {
            this.highlightFace(face);
        }
        for (const edge of solid.allEdges) {
            this.highlightCurveEdge(edge);
        }
        solid.layers.set(visual.Layers.Solid);
    }

    private highlightRegion(item: visual.PlaneInstance<visual.Region>) {
        const { selected } = this.selection;
        for (const level of item.levels) {
            const region = level as visual.Region;
            region.child.material = selected.regionIds.has(region.simpleName) ? region_highlighted : region_unhighlighted;
            region.layers.set(visual.Layers.Region);
            region.child.layers.set(visual.Layers.Region);
        }
    }

    private highlightCurve(item: visual.SpaceInstance<visual.Curve3D>) {
        const { selected } = this.selection;
        for (const level of item.levels) {
            const curve = level as visual.Curve3D;
            const layer = curve.isFragment ? visual.Layers.CurveFragment : visual.Layers.Curve;
            const occludedLayer = curve.isFragment ? visual.Layers.CurveFragment_XRay : visual.Layers.XRay;
            const isSelected = selected.curveIds.has(item.simpleName);
            for (const segment of curve.segments) {
                segment.line.material = isSelected ? line_highlighted : line_unhighlighted;
                segment.line.layers.set(layer);
                segment.occludedLine.layers.set(occludedLayer);
            }
            const geometry = curve.points.geometry;
            if (geometry !== undefined) {
                const colors = geometry.attributes.color;
                const array = colors.array as unknown as Float32Array;
                for (let i = 0; i < array.length / 3; i++) {
                    array[i * 3 + 0] = controlPoint_unhighlighted.r;
                    array[i * 3 + 1] = controlPoint_unhighlighted.g;
                    array[i * 3 + 2] = controlPoint_unhighlighted.b;
                }
                colors.needsUpdate = true;
            }
            curve.layers.set(visual.Layers.Curve);
        }
    }

    private highlightControlPoints() {
        const { selected } = this.selection;
        for (const point of selected.controlPoints) {
            const geometry = point.geometry!;
            const colors = geometry.attributes.color;
            const array = colors.array as unknown as Float32Array;
            array[point.index * 3 + 0] = controlPoint_highlighted.r;
            array[point.index * 3 + 1] = controlPoint_highlighted.g;
            array[point.index * 3 + 2] = controlPoint_highlighted.b;
            colors.needsUpdate = true;
        }
    }

    private highlightCurveEdge(edge: visual.CurveEdge) {
        const { selected } = this.selection;

        edge.visible = true;
        edge.child.material = selected.edgeIds.has(edge.simpleName) ? line_highlighted : line_unhighlighted;
        edge.layers.set(visual.Layers.CurveEdge);
        edge.child.layers.set(visual.Layers.CurveEdge);
    }

    protected highlightFace(face: visual.Face, highlighted: THREE.Material = face_highlighted, unhighlighted: THREE.Material = face_unhighlighted) {
        const selection = this.selection.selected;
        if (selection.faceIds.has(face.simpleName)) {
            face.child.material = highlighted;
        } else {
            face.child.material = unhighlighted;
        }
        face.layers.set(visual.Layers.Face);
        face.child.layers.set(visual.Layers.Face);
    }

    setResolution(size: THREE.Vector2) {
        for (const material of this.lines) {
            material.resolution.copy(size);
        }
    }

    get outlineSelection() { return this.selection.selected.solids }
    get outlineHover() { return this.selection.hovered.solids }

}

export class CurveHighlightManager extends HighlightManager {

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
                // But only if they're unselected
                if (selected.faceIds.has(face.simpleName)) {
                    face.child.material = invisible_highlighted;
                } else {
                    face.child.material = invisible;
                }
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

    protected hoverFace(item: visual.Face) {
        const { views } = this.db.lookupTopologyItemById(item.simpleName);
        for (const view of views) {
            const face = view as visual.Face;
            const solid = face.parentItem;
            switch (this.modifiers.stateOf(solid)) {
                case 'premodified':
                    face.child.material = invisible_hovered;
                    break;
                default:
                    face.child.material = face_hovered;
            }
        }
    }

    protected unhoverFace(item: visual.Face) {
        const { views } = this.db.lookupTopologyItemById(item.simpleName);
        for (const topo of views) {
            const face = topo as visual.Face;
            const solid = face.parentItem;
            switch (this.modifiers.stateOf(solid)) {
                case 'premodified':
                    this.highlightFace(face, invisible_highlighted, invisible);
                    break;
                default:
                    this.highlightFace(face, face_highlighted, face_unhighlighted);
            }
        }
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
const controlPoint_unhighlighted = new THREE.Color(0xa000aa);

const invisible = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
});

const invisible_highlighted = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffff00).convertGammaToLinear(),
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    depthTest: false,
});


const invisible_hovered = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffffcc).convertGammaToLinear(),
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    depthTest: false,
});