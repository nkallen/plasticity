import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { Model as PointPicker } from "../../../commands/PointPicker";
import { DatabaseLike } from "../../../editor/GeometryDatabase";
import * as intersectable from "../../../editor/Intersectable";
import { AxisSnap, ConstructionPlaneSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PlaneSnap, PointSnap, Snap } from "../../../editor/snaps/Snap";
import { SnapManager, SnapResult } from "../../../editor/snaps/SnapManager";
import * as visual from "../../../editor/VisualModel";
import { inst2curve } from "../../../util/Conversion";
import { Viewport } from "../Viewport";
import { GeometryGPUPickingAdapter, GPUPickingAdapter } from "./GeometryGPUPickingAdapter";
import { DebugRenderTarget, GPUDepthReader } from "./GPUPicker";
import { IdMaterial, LineVertexColorMaterial, PointsVertexColorMaterial, vertexColorLineMaterial } from "./GPUPickingMaterial";

export class SnapIdEncoder {
    encode(type: 'manager' | 'point-picker', index: number) {
        index++; // NOTE: use 1-based indexing, since 0 is the clear color
        return type == 'manager' ? index : (index | (1 << 15));
    }
    decode(data: number): ['manager' | 'point-picker', number] | undefined {
        if (data === 0) return undefined;
        return data >> 15 === 0 ? ['manager', data - 1] : ['point-picker', (data & ~(1 << 15)) - 1]
    }
}

export class DebugSnapIdEncoder extends SnapIdEncoder {
    encode(type: 'manager' | 'point-picker', index: number) {
        index |= 0xf0000000; // NOTE: don't need to increment because always nonzero
        return type == 'manager' ? index : (index | 0x8000);
    }
    decode(data: number): ['manager' | 'point-picker', number] | undefined {
        data &= 0x0fffffff;
        return data >> 15 === 0 ? ['manager', data] : ['point-picker', (data & 0xffff7fff)]
    }
}

export class SnapGPUPickingAdapter implements GPUPickingAdapter<SnapResult> {
    private managerSnaps: Snap[] = [];
    private pointPickerSnaps: Snap[] = [];
    private pickers: THREE.Object3D[] = [];
    private readonly _nearby = new NearbyGUPicker(100, this.viewport.picker.pickingTarget, this.viewport);

    static encoder = process.env.NODE_ENV == 'development' ? new DebugSnapIdEncoder() : new SnapIdEncoder();

    constructor(private readonly viewport: Viewport, private readonly snaps: SnapManager, private readonly pointPicker: PointPicker, private readonly db: DatabaseLike) {
        this.update();
    }

    private readonly normalizedScreenPoint = new THREE.Vector2();
    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.normalizedScreenPoint.copy(normalizedScreenPoint);
        this.viewport.picker.setFromCamera(normalizedScreenPoint, camera);
        this.raycaster.setFromCamera(normalizedScreenPoint, camera);
        this._nearby.setFromCamera(normalizedScreenPoint, camera);
        this.raycaster.layers.enableAll();
    }

    private readonly raycaster = new THREE.Raycaster();
    intersect(): SnapResult[] {
        const intersection = this.viewport.picker.intersect();
        let snap, approximatePosition;
        if (intersection === undefined) {
            const constructionPlane = this.pointPicker.actualConstructionPlaneGiven(this.viewport.constructionPlane, this.viewport.isOrtho);
            this.raycaster.setFromCamera(this.normalizedScreenPoint, this.viewport.camera);
            const intersections = this.raycaster.intersectObject(constructionPlane.snapper);
            if (intersections.length === 0) throw new Error("Invalid condition: should always be able to intersect with construction plane");
            approximatePosition = intersections[0].point;
            snap = constructionPlane;
        } else {
            const { id, position: pos } = intersection;
            approximatePosition = pos;
            if (GeometryGPUPickingAdapter.encoder.parentIdMask & id) {
                const intersectable = GeometryGPUPickingAdapter.get(id, this.db);
                snap = this.intersectable2snap(intersectable);
            } else {
                const [type, index] = SnapGPUPickingAdapter.encoder.decode(id)!;
                snap = (type == 'manager') ? this.managerSnaps[index] : this.pointPickerSnaps[index];
            }
        }
        const { position: precisePosition, orientation } = snap.project(approximatePosition);
        return [{ snap, position: precisePosition, orientation }];
    }

    nearby(): PointSnap[] {
        const snaps: PointSnap[] = [];
        const ids = this._nearby.intersectObjects(this.points);
        for (const id of ids) {
            const [type, index] = SnapGPUPickingAdapter.encoder.decode(id)!;
            const snap = (type == 'manager') ? this.managerSnaps[index] : this.pointPickerSnaps[index];
            if (!(snap instanceof PointSnap)) throw new Error("validation error");
            snaps.push(snap);
        }
        return snaps;
    }

    private intersectable2snap(intersectable: intersectable.Intersectable): Snap {
        if (intersectable instanceof visual.Face) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.SpaceInstance) {
            const model = this.db.lookup(intersectable);
            return new CurveSnap(intersectable, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target");
        }
    }

    private update() {
        const { pointPicker } = this;
        this.pickers = [];
        const restrictions = pointPicker.restrictionSnaps;
        if (restrictions.length > 0) {
            const pickers = this.makePickers(restrictions, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
            this.pickers.push(...pickers);
        } else {
            this.manager();
            this.model();
            this.pickers.push(...this.db.visibleObjects.map(o => o.picker));
        }
        this.viewport.picker.update(this.pickers);
    }

    // FIXME: only run when the scene graph changes; thus need a persistent cache object
    manager() {
        const { snaps } = this;
        this.managerSnaps = snaps.all;
        const pickers = this.makePickers(this.managerSnaps, i => SnapGPUPickingAdapter.encoder.encode('manager', i));
        this.pickers.push(...pickers);
    }

    model() {
        const { pointPicker } = this;
        const additional = pointPicker.snaps;
        this.pointPickerSnaps = additional;
        const pickers = this.makePickers(this.pointPickerSnaps, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
        this.pickers.push(...pickers);
    }

    private makePickers(snaps: Snap[], name: (index: number) => number) {
        const points: [number, THREE.Vector3][] = [];
        const axes: { position: Float32Array; userData: { index: number; }; }[] = [];
        const planes: THREE.Mesh[] = [];
        const p = new THREE.Vector3;
        for (const [i, snap] of snaps.entries()) {
            const id = name(i);
            if (snap instanceof PointSnap) {
                points.push([id, snap.position]);
            } else if (snap instanceof AxisSnap) {
                p.copy(snap.o).add(snap.n).multiplyScalar(100);
                const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
                axes.push({ position, userData: { index: id } });
            } else if (snap instanceof ConstructionPlaneSnap) {
                const geo = PlaneSnap.geometry;
                // FIXME: dispose of material
                const mesh = new THREE.Mesh(geo, new IdMaterial(id));
                planes.push(mesh);
            } else {
                console.error(snap.constructor.name);
                throw new Error("Invalid snap");
            }
        }
        // FIXME: dispose of geometry
        const pointCloud = PointsVertexColorMaterial.make(points, { size: 1, polygonOffset: true, polygonOffsetFactor: -100, polygonOffsetUnits: -100 });
        const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
        // @ts-expect-error
        const line = new LineSegments2(lineGeometry, vertexColorLineMaterial);

        this.points.push(pointCloud);

        return [pointCloud, line, ...planes];
    }
    private points: THREE.Points[] = [];
}

class NearbyGUPicker {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    private readonly scene = new THREE.Scene();
    readonly nearbyTarget = new THREE.WebGLRenderTarget(this.radius * this.dpr, this.radius * this.dpr, { depthBuffer: true });
    private readonly nearbyBuffer: Readonly<Uint8Array> = new Uint8Array(this.radius * this.radius * this.dpr * this.dpr * 4);

    constructor(private readonly radius: number, private readonly pickingTarget: THREE.WebGLRenderTarget, private readonly viewport: Viewport) {
    }

    intersectObjects(objects: THREE.Points[]) {
        const { viewport: { renderer, camera }, scene, pickingTarget, nearbyTarget, nearbyBuffer, denormalizedScreenPoint, dpr, radius } = this;

        // Draw a bounding rectangle with x,y representing upper-left. It surrounds the mouse cursor by size,size
        const x = (denormalizedScreenPoint.x - radius * dpr) | 0;
        const y = (denormalizedScreenPoint.y + radius * dpr) | 0; // WebGL screen coordinatse are 0,0 in lower-left corner
        const x_dom = x;
        const y_dom = (renderer.domElement.height - denormalizedScreenPoint.y - radius * dpr) | 0; // DOM coordinates are 0,0 in upper-left corner

        this.scene.clear();
        for (const object of objects) scene.add(object);

        renderer.setRenderTarget(nearbyTarget);
        // renderer.setRenderTarget(null);
        nearbyTarget.depthTexture = pickingTarget.depthTexture;
        renderer.autoClearDepth = false;
        camera.setViewOffset(renderer.domElement.width, renderer.domElement.height, x_dom, y_dom, radius, radius); // takes DOM coordinates
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.autoClearDepth = true;
        camera.clearViewOffset();

        renderer.readRenderTargetPixels(nearbyTarget, 0, 0, radius * dpr, radius * dpr, nearbyBuffer); // takes WebGL coordinates
        const ids = new Uint32Array(nearbyBuffer.buffer);

        console.time("setify")
        const set = new Set<number>();
        for (const id of ids) set.add(id);
        console.timeEnd("setify");
        console.log(set);

        const debug = new DebugRenderTarget(this.nearbyTarget, this.viewport);
        debug.render();

        return set;
    }

    private readonly normalizedScreenPoint = new THREE.Vector2();
    private readonly denormalizedScreenPoint = new THREE.Vector2();
    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.normalizedScreenPoint.copy(normalizedScreenPoint);
        this.viewport.denormalizeScreenPosition(this.denormalizedScreenPoint.copy(normalizedScreenPoint));
        this.denormalizedScreenPoint.multiplyScalar(this.dpr);
    }

    get dpr() {
        return this.viewport.renderer.getPixelRatio();
    }
}