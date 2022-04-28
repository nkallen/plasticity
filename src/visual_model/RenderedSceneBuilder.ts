import { CompositeDisposable, Disposable } from "event-kit";
import signals from "signals";
import * as THREE from "three";
import { ColorRepresentation } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { DatabaseLike } from "../editor/DatabaseLike";
import { EditorSignals } from "../editor/EditorSignals";
import { Empty } from "../editor/Empties";
import { Scene } from "../editor/Scene";
import { TextureLoader } from "../editor/TextureLoader";
import basic_side from '../img/matcap/basic_side.exr';
import ceramicDark from '../img/matcap/ceramic_dark.exr';
import { HasSelectedAndHovered, Selectable } from "../selection/SelectionDatabase";
import { Theme } from "../startup/ConfigFiles";
import * as visual from '../visual_model/VisualModel';

type State = { tag: 'none' } | { tag: 'scratch', selection: HasSelectedAndHovered }
type Mode = { tag: 'normal', material: THREE.Material & { color: ColorRepresentation } } | { tag: 'rendered', material: THREE.Material & { color: ColorRepresentation } };
export type MaterialMode = 'matcap' | 'colored-matcap' | 'colored-silhouette' | 'black-silhouette';

export class RenderedSceneBuilder {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    private state: State = { tag: 'none' };

    private _mode: Mode = { tag: 'normal', material: face_unhighlighted_matcap };
    get mode(): Readonly<Mode> { return this._mode }
    set mode(mode: Mode | Mode['tag']) {
        if (this._mode === mode) return;
        if (typeof mode === 'string') {
            this._mode = { tag: mode, material: this._mode.material }
        } else {
            this._mode = mode;
        }
        this.highlight();
    }

    constructor(
        private readonly db: DatabaseLike,
        private readonly scene: Scene,
        private readonly textures: TextureLoader,
        private readonly editorSelection: HasSelectedAndHovered,
        theme: Theme,
        private readonly signals: EditorSignals,
    ) {
        const bindings: signals.SignalBinding[] = [];
        bindings.push(signals.temporaryObjectAdded.add(({ view, ancestor }) => {
            let material = ancestor !== undefined ? this.scene.getMaterial(ancestor, true) : undefined;
            material ??= this.mode.tag === 'rendered' ? defaultPhysicalMaterial : this.mode.material;
            this.highlightItem(view, material);
        }));
        bindings.push(signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution)));
        bindings.push(signals.commandEnded.add(this.highlight));
        bindings.push(signals.backupLoaded.add(this.highlight));
        bindings.push(signals.historyChanged.add(this.highlight));
        bindings.push(signals.quasimodeChanged.add(this.highlight));
        bindings.push(signals.hoverDelta.add(({ added, removed }) => {
            this.unhover(removed);
            this.hover(added);
        }));
        this.disposable.add(new Disposable(() => {
            for (const binding of bindings) binding.detach();
        }));

        this.setTheme(theme);
        this.setMatcap(ceramicDark);
    }

    private get selection() {
        switch (this.state.tag) {
            case 'none': return this.editorSelection;
            case 'scratch': return this.state.selection;
        }
    }

    // FIXME: combine hovered and unhovered by combining highlightCurve/etc with hoverCurve/etc.
    hover(hovered: Set<Selectable>) {
        performance.mark('begin-hover');
        const facesChanged = new Set<visual.Solid>();
        const edgesChanged = new Set<visual.Solid>();
        for (const item of hovered) {
            if (item instanceof visual.SpaceInstance) {
                this.hoverCurve(item);
            } else if (item instanceof visual.Face) {
                facesChanged.add(item.parentItem);
            } else if (item instanceof visual.CurveEdge) {
                edgesChanged.add(item.parentItem);
            } else if (item instanceof visual.PlaneInstance) {
                this.hoverRegion(item);
            } else if (item instanceof visual.ControlPoint) {
                this.hoverControlPoint(item);
            }
        }
        for (const item of facesChanged) this.highlightFaces(item);
        for (const item of edgesChanged) this.highlightEdges(item);
        performance.measure('hover', 'begin-hover');
    }

    private hoverRegion(item: visual.PlaneInstance<visual.Region>) {
        item.underlying.mesh.material = region_hovered;
    }

    protected hoverFace(item: visual.Face) {
    }

    private hoverCurve(item: visual.SpaceInstance<visual.Curve3D>) {
        const curve = item.underlying;
        curve.line.material = line_hovered;
    }

    private hoverControlPoint(v: visual.ControlPoint) {
        const geometry = v.geometry!;
        const colors = geometry.attributes.color;
        const array = colors.array as unknown as Uint8Array;
        array[v.index * 3 + 0] = controlPoint_hovered.r * 255;
        array[v.index * 3 + 1] = controlPoint_hovered.g * 255;
        array[v.index * 3 + 2] = controlPoint_hovered.b * 255;
        colors.needsUpdate = true;
    }

    unhover(hovered: Set<Selectable>) {
        performance.mark('begin-unhover');
        const facesChanged = new Set<visual.Solid>();
        const edgesChanged = new Set<visual.Solid>();
        for (const item of hovered) {
            if (item instanceof visual.SpaceInstance) {
                this.highlightCurve(item);
            } else if (item instanceof visual.Face) {
                facesChanged.add(item.parentItem);
            } else if (item instanceof visual.CurveEdge) {
                edgesChanged.add(item.parentItem);
            } else if (item instanceof visual.PlaneInstance) {
                this.highlightRegion(item);
            } else if (item instanceof visual.ControlPoint) {
                this.highlightCurve(item.parentItem);
            }
        }
        for (const item of facesChanged) this.highlightFaces(item);
        for (const item of edgesChanged) this.highlightEdges(item);
        performance.measure('unhover', 'begin-unhover');
    }

    protected unhoverFace(item: visual.Face) { }

    highlight = () => {
        performance.mark('begin-highlight');
        for (const item of this.scene.visibleObjects) {
            this.highlightItem(item);
        }
        this.highlightControlPoints();
        performance.measure('highlight', 'begin-highlight');
    }

    private readonly lines = [line_unselected, line_selected, line_edge, line_hovered];

    highlightItem = (item: visual.SpaceItem, materialOverride?: THREE.Material & { color: ColorRepresentation }) => {
        if (item instanceof visual.Solid) {
            this.highlightSolid(item, materialOverride);
        } else if (item instanceof visual.SpaceInstance) {
            this.highlightSpaceInstance(item);
        } else if (item instanceof visual.PlaneInstance) {
            this.highlightRegion(item);
        } else if (item instanceof Empty) {
            this.highlightEmpty(item);
        } else {
            throw new Error("invalid type: " + item.constructor.name);
        }
        item.updateMatrixWorld();
    }

    private highlightSolid(solid: visual.Solid, override?: THREE.Material & { color: ColorRepresentation }) {
        this.highlightFaces(solid, override);
        this.highlightEdges(solid);
        solid.layers.set(visual.Layers.Solid);
    }

    private highlightEmpty(empty: Empty) {
        const transform = this.scene.getTransform(empty, true);
        if (transform !== undefined) {
            empty.position.copy(transform.position);
            empty.quaternion.copy(transform.quaternion);
            empty.scale.copy(transform.scale);
        }
        empty.layers.set(visual.Layers.Empty);
    }

    private highlightRegion(item: visual.PlaneInstance<visual.Region>) {
        const { selected } = this.selection;
        const region = item.underlying as visual.Region;
        region.mesh.material = selected.regionIds.has(region.simpleName) ? region_highlighted : region_unhighlighted;
        region.layers.set(visual.Layers.Region);
        region.mesh.layers.set(visual.Layers.Region);
    }

    private highlightSpaceInstance(item: visual.SpaceInstance<any>) {
        const underlying = item.underlying;
        if (underlying instanceof visual.Curve3D) {
            this.highlightCurve(item);
        } else if (underlying instanceof visual.Surface) {
        }
    }

    private highlightCurve(item: visual.SpaceInstance<visual.Curve3D>) {
        const { selected } = this.selection;
        const curve = item.underlying;
        const layer = curve.isFragment ? visual.Layers.CurveFragment : visual.Layers.Curve;
        const occludedLayer = curve.isFragment ? visual.Layers.CurveFragment_XRay : visual.Layers.CurveEdge_XRay;
        const isSelected = selected.curveIds.has(item.simpleName);
        curve.line.material = isSelected ? line_selected : line_unselected;
        curve.line.layers.set(layer);
        curve.occludedLine.layers.set(occludedLayer);
        curve.layers.set(layer);
        const geometry = curve.points.geometry;
        const colors = geometry.attributes.color;
        if (colors === undefined) return;
        const colorsArray = colors.array as unknown as Uint8Array;
        for (let i = 0; i < colorsArray.length / 3; i++) {
            const id = visual.ControlPoint.simpleName(item.simpleName, i);
            const color = selected.controlPointIds.has(id) ? controlPoint_highlighted : controlPoint_unhighlighted;
            colorsArray[i * 3 + 0] = color.r * 255;
            colorsArray[i * 3 + 1] = color.g * 255;
            colorsArray[i * 3 + 2] = color.b * 255;
        }
        colors.needsUpdate = true;
    }

    private highlightControlPoints() {
        const { selected } = this.selection;
        for (const point of selected.controlPoints) {
            const geometry = point.geometry!;
            const colors = geometry.attributes.color;
            const array = colors.array as unknown as Uint8Array;
            array[point.index * 3 + 0] = controlPoint_highlighted.r * 255;
            array[point.index * 3 + 1] = controlPoint_highlighted.g * 255;
            array[point.index * 3 + 2] = controlPoint_highlighted.b * 255;
            colors.needsUpdate = true;
        }
    }

    protected highlightEdges(solid: visual.Solid) {
        const selection = this.selection.selected;
        const hovering = this.selection.hovered;
        for (const lod of [solid.lod.high, solid.lod.low]) {
            const edgegroup = lod.edges;
            let hovered: visual.CurveEdge[] = [];
            let selected: visual.CurveEdge[] = [];

            for (const edge of edgegroup) {
                if (hovering.edgeIds.has(edge.simpleName)) {
                    hovered.push(edge);
                } else if (selection.edgeIds.has(edge.simpleName)) {
                    selected.push(edge);
                }
            }

            const pairs: [visual.CurveEdge[], LineMaterial][] = [[selected, line_selected], [hovered, line_hovered]];
            edgegroup.temp.clear();
            for (const [edges, mat] of pairs) {
                if (edges.length === 0) continue;
                const sliced = edgegroup.slice(edges);
                sliced.material = mat;
                edgegroup.temp.add(sliced);
            }
        }
    }

    protected highlightFaces(solid: visual.Solid, override?: THREE.Material & { color: ColorRepresentation }) {
        const selection = this.selection.selected;
        const hovering = this.selection.hovered;
        const particularMaterial = override ?? this.scene.getMaterial(solid, true);
        for (const lod of [solid.lod.high, solid.lod.low]) {
            const facegroup = lod.faces;
            let hovered: visual.GeometryGroup[] = [];
            let selected: visual.GeometryGroup[] = [];
            let unselected: visual.GeometryGroup[] = [];
            for (const face of facegroup) {
                if (hovering.faceIds.has(face.simpleName)) {
                    hovered.push(face.group);
                } else if (selection.faceIds.has(face.simpleName)) {
                    selected.push(face.group);
                }
                unselected.push(face.group);
            }
            hovered = visual.GeometryGroupUtils.compact(hovered);
            selected = visual.GeometryGroupUtils.compact(selected);
            unselected = visual.GeometryGroupUtils.compact(unselected);
            const hovered_phantom = hovered.map(u => ({ ...u }));
            hovered.forEach(s => s.materialIndex = 0);
            selected.forEach(s => s.materialIndex = 1);
            unselected.forEach(s => s.materialIndex = 2);
            hovered_phantom.forEach(s => s.materialIndex = 3);
            if (this.mode.tag === 'normal') {
                let material = this.mode.material;
                if ((material === face_unhighlighted_colored_matcap || material === face_unhighlighted_colored_silhouette) && particularMaterial !== undefined) {
                    const colored = material.clone() as THREE.Material & { color: THREE.Color };
                    colored.color.set(particularMaterial.color);
                    material = colored;
                }
                facegroup.mesh.material = [face_hovered, face_highlighted, material, face_hovered_phantom]
            } else {
                facegroup.mesh.material = [face_hovered, face_highlighted, override ?? particularMaterial ?? defaultPhysicalMaterial, face_hovered_phantom];
            }
            facegroup.mesh.geometry.groups = [...hovered, ...selected, ...unselected, ...hovered_phantom];
        }
    }

    setResolution(size: THREE.Vector2) {
        for (const material of this.lines) {
            material.resolution.copy(size);
        }
    }

    get outlineSelection() { return this.selection.selected.solids }
    get outlineHover() { return this.selection.hovered.solids }

    useTemporary(selection: HasSelectedAndHovered) {
        switch (this.state.tag) {
            case 'none': this.state = { tag: 'scratch', selection }; break;
            case 'scratch': throw new Error("already in scratch state");
        }
        this.signals.selectionChanged.dispatch();
        const bindings: signals.SignalBinding[] = [];
        bindings.push(selection.signals.selectionDelta.add(() => this.highlight()));
        bindings.push(selection.signals.hoverDelta.add(({ added, removed }) => {
            this.unhover(removed);
            this.hover(added);
            this.signals.hoverDelta.dispatch({ added, removed });
        }));
        return new Disposable(() => {
            bindings.forEach(x => x.detach());
            this.state = { tag: 'none' };
            this.highlight();
            this.signals.selectionChanged.dispatch();
        })
    }

    private setTheme(theme: Theme) {
        face_unhighlighted_matcap.color.setStyle(theme.colors.matcap).convertSRGBToLinear();
        face_highlighted.color.setStyle(theme.colors.yellow[200]).convertSRGBToLinear();
        face_hovered.color.setStyle(theme.colors.yellow[500]).convertSRGBToLinear();
        line_unselected.color.setStyle(theme.colors.blue[400]).convertSRGBToLinear();
        region_hovered.color.setStyle(theme.colors.blue[200]).convertSRGBToLinear();
        region_highlighted.color.setStyle(theme.colors.blue[300]).convertSRGBToLinear();
        region_unhighlighted.color.setStyle(theme.colors.blue[400]).convertSRGBToLinear();
    }

    async setMatcap(name: string): Promise<THREE.Texture> {
        const { texture, loaded } = this.textures.get(name);
        face_unhighlighted_matcap.matcap = texture;
        const mode = this._mode;
        if (mode.tag === 'normal' && mode.material !== face_unhighlighted_matcap) {
            mode.material = face_unhighlighted_matcap;
            this.highlight();
        }
        return loaded;
    }

    async setMaterialMode(mmode: MaterialMode) {
        const mode = this._mode;
        switch (mode.tag) {
            case 'normal':
                switch (mmode) {
                    case 'matcap': mode.material = face_unhighlighted_matcap; break;
                    case 'black-silhouette': mode.material = face_unhighlighted_black_silhouette; break;
                    case 'colored-silhouette': mode.material = face_unhighlighted_colored_silhouette; break;
                    case 'colored-matcap':
                        mode.material = face_unhighlighted_colored_matcap;
                        const { texture, loaded } = this.textures.get(basic_side);
                        face_unhighlighted_colored_matcap.matcap = texture;
                        await loaded;
                        break;
                }
                this.highlight();
        }
    }
}

const line_unselected = new LineMaterial({ linewidth: 1.5 });
line_unselected.polygonOffset = true;
line_unselected.polygonOffsetFactor = -20;
line_unselected.polygonOffsetUnits = -20;

const line_edge = new LineMaterial({ linewidth: 1.4, vertexColors: true });

const line_selected = new LineMaterial({ color: 0xffff00, linewidth: 2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
line_selected.depthFunc = THREE.AlwaysDepth;

const line_hovered = new LineMaterial({ color: 0xffffff, linewidth: 2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
line_hovered.depthFunc = THREE.AlwaysDepth;

export const face_unhighlighted_matcap = new THREE.MeshMatcapMaterial();
face_unhighlighted_matcap.fog = false;
face_unhighlighted_matcap.polygonOffset = true;
face_unhighlighted_matcap.polygonOffsetFactor = 1;
face_unhighlighted_matcap.polygonOffsetUnits = 2;

export const face_unhighlighted_black_silhouette = new THREE.MeshBasicMaterial();
face_unhighlighted_black_silhouette.color = new THREE.Color(0x0);
face_unhighlighted_black_silhouette.polygonOffset = true;
face_unhighlighted_black_silhouette.polygonOffsetFactor = 1;
face_unhighlighted_black_silhouette.polygonOffsetUnits = 2;

export const face_unhighlighted_colored_silhouette = new THREE.MeshBasicMaterial();
face_unhighlighted_colored_silhouette.color = new THREE.Color(0xffffff);
face_unhighlighted_colored_silhouette.polygonOffset = true;
face_unhighlighted_colored_silhouette.polygonOffsetFactor = 1;
face_unhighlighted_colored_silhouette.polygonOffsetUnits = 2;

export const face_unhighlighted_colored_matcap = new THREE.MeshMatcapMaterial();
face_unhighlighted_matcap.fog = false;
face_unhighlighted_matcap.polygonOffset = true;
face_unhighlighted_matcap.polygonOffsetFactor = 1;
face_unhighlighted_matcap.polygonOffsetUnits = 2;

const face_highlighted = new THREE.MeshBasicMaterial();
face_highlighted.fog = false;
face_highlighted.opacity = 0.2;
face_highlighted.transparent = true;
face_highlighted.polygonOffset = true;
face_highlighted.polygonOffsetFactor = 1;
face_highlighted.polygonOffsetUnits = 1;

const face_highlighted_phantom = face_highlighted.clone();
face_highlighted_phantom.depthFunc = THREE.AlwaysDepth;
face_highlighted_phantom.transparent = true;
face_highlighted_phantom.opacity = 0.0;

const face_hovered = new THREE.MeshBasicMaterial();
face_hovered.fog = false;
face_hovered.transparent = true;
face_hovered.opacity = 0.1;
face_hovered.polygonOffset = true;
face_hovered.polygonOffsetFactor = 1;
face_hovered.polygonOffsetUnits = 1;

const face_hovered_phantom = face_hovered.clone();
face_hovered_phantom.depthFunc = THREE.AlwaysDepth;
face_hovered_phantom.transparent = true;
face_hovered_phantom.opacity = 0.2;
face_hovered_phantom.side = THREE.DoubleSide;

const region_hovered = new THREE.MeshBasicMaterial();
region_hovered.fog = false;
region_hovered.opacity = 0.5;
region_hovered.transparent = true;
region_hovered.side = THREE.DoubleSide;
region_hovered.polygonOffset = true;
region_hovered.polygonOffsetFactor = -10;
region_hovered.polygonOffsetUnits = -1;
region_hovered.depthFunc = THREE.AlwaysDepth;

const region_highlighted = new THREE.MeshBasicMaterial();
region_highlighted.fog = false;
region_highlighted.opacity = 0.9;
region_highlighted.transparent = true;
region_highlighted.side = THREE.DoubleSide;
region_highlighted.polygonOffset = true;
region_highlighted.polygonOffsetFactor = -10;
region_highlighted.polygonOffsetUnits = -1;

export const region_unhighlighted = new THREE.MeshBasicMaterial();
region_unhighlighted.fog = false;
region_unhighlighted.opacity = 0.1;
region_unhighlighted.transparent = true;
region_unhighlighted.side = THREE.DoubleSide;
region_unhighlighted.polygonOffset = true;
region_unhighlighted.polygonOffsetFactor = -10;
region_unhighlighted.polygonOffsetUnits = -1;


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
    color: new THREE.Color(0xffff00).convertSRGBToLinear(),
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    depthTest: false,
});

const invisible_hovered = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffffcc).convertSRGBToLinear(),
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    depthTest: false,
});


export const defaultPhysicalMaterial = new THREE.MeshPhysicalMaterial({
    metalness: 1,
    roughness: 0.1,
    ior: 1.5,
    specularColor: new THREE.Color(0xffffff),
    color: new THREE.Color(0xffffff),
    envMapIntensity: 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
});
