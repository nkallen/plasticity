import { CompositeDisposable, Disposable } from "event-kit";
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
import { IdMaterial, LineVertexColorMaterial, PointsVertexColorMaterial } from "./GPUPickingMaterial";
import { readRenderTargetPixelsAsync } from "./GPUWaitAsync";

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
    dispose() { this.pointPickerInfo?.dispose() }

    private pointPickerSnaps: Snap[] = [];
    private pickers: THREE.Object3D[] = [];
    private readonly _nearby = new NearbySnapGPUicker(100, this.viewport.picker.pickingTarget, this.viewport);

    static encoder = process.env.NODE_ENV == 'development' ? new DebugSnapIdEncoder() : new SnapIdEncoder();

    constructor(private readonly viewport: Viewport, private readonly snaps: SnapManagerGeometryCache, private readonly pointPicker: PointPicker, private readonly db: DatabaseLike) {
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
                snap = (type == 'manager') ? this.snaps.all[index] : this.pointPickerSnaps[index];
            }
        }
        const { position: precisePosition, orientation } = snap.project(approximatePosition);
        return [{ snap, position: precisePosition, orientation }];
    }

    nearby(): PointSnap[] {
        const snaps: PointSnap[] = [];
        const ids = this._nearby.intersectObjects([this.pointPickerInfo!.points, this.snaps.points]);
        for (const id of ids) {
            const [type, index] = SnapGPUPickingAdapter.encoder.decode(id)!;
            const snap = (type == 'manager') ? this.snaps.all[index] : this.pointPickerSnaps[index];
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

    private pointPickerInfo?: PickerInfo;
    private update() {
        const { pointPicker, snaps } = this;
        this.pointPickerInfo?.dispose();

        this.pickers = [];
        const restrictions = pointPicker.restrictionSnaps;
        if (restrictions.length > 0) {
            const info = makePickers(restrictions, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
            this.pointPickerInfo = info;
            this.pickers.push(info.lines, info.points, ...info.planes);
        } else {
            const info = this.model();
            this.pointPickerInfo = info;
            this.pickers.push(info.lines, info.points, ...info.planes);
            this.pickers.push(snaps.lines, snaps.points, ...snaps.planes);
            this.pickers.push(...this.db.visibleObjects.map(o => o.picker));
        }
        this.viewport.picker.update(this.pickers);
    }

    model() {
        const { pointPicker } = this;
        const additional = pointPicker.snaps;
        this.pointPickerSnaps = additional;
        return makePickers(this.pointPickerSnaps, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
    }
}

export class SnapManagerGeometryCache implements PickerInfo {
    dispose() { this.info?.dispose() }

    all!: Snap[];
    private info?: PickerInfo;

    get lines() { return this.info!.lines }
    get points() { return this.info!.points }
    get planes() { return this.info!.planes }

    constructor(private readonly snaps: SnapManager) {
        this.update();
    }

    private update() {
        const { snaps, info } = this;
        info?.dispose();

        this.all = snaps.all;
        this.info = makePickers(this.all, i => SnapGPUPickingAdapter.encoder.encode('manager', i));
    }

}

interface PickerInfo {
    points: THREE.Points<THREE.BufferGeometry, PointsVertexColorMaterial>;
    lines: LineSegments2;
    planes: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>[];
    dispose(): void;
};

function makePickers(snaps: Snap[], name: (index: number) => number): PickerInfo {
    const disposable = new CompositeDisposable();
    const pointInfo: [number, THREE.Vector3][] = [];
    const axes: { position: Float32Array; userData: { index: number; }; }[] = [];
    const planes: THREE.Mesh[] = [];
    const p = new THREE.Vector3;
    for (const [i, snap] of snaps.entries()) {
        const id = name(i);
        if (snap instanceof PointSnap) {
            pointInfo.push([id, snap.position]);
        } else if (snap instanceof AxisSnap) {
            p.copy(snap.n).multiplyScalar(10_000).add(snap.o);
            const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
            axes.push({ position, userData: { index: id } });
        } else if (snap instanceof ConstructionPlaneSnap) {
            const geo = PlaneSnap.geometry;
            const mat = new IdMaterial(id);
            disposable.add(new Disposable(() => mat.dispose()));
            const mesh = new THREE.Mesh(geo, mat);
            planes.push(mesh);
        } else {
            console.error(snap.constructor.name);
            throw new Error("Invalid snap");
        }
    }
    const pointsGeometry = PointsVertexColorMaterial.make(pointInfo);
    const pointsMaterial = new PointsVertexColorMaterial({ size: 35, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 0 });
    disposable.add(new Disposable(() => {
        pointsGeometry.dispose();
        pointsMaterial.dispose();
    }));
    const points = new THREE.Points(pointsGeometry, pointsMaterial);

    const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
    disposable.add(new Disposable(() => {
        lineGeometry.dispose();
    }))
    // @ts-expect-error
    const lines = new LineSegments2(lineGeometry, vertexColorLineMaterial);

    lines.renderOrder = visual.RenderOrder.SnapLines;
    points.renderOrder = visual.RenderOrder.SnapPoints;

    return { points, lines, planes, dispose() { disposable.dispose() } };
}

/**
 * Find snap-points nearby the user's mouse cursor. Render a radius*radius box around the mouse cursor; iterate through the
 * pixels, counting unique colors. Re-use the existing Z-buffer if x-ray mode is off.
 */
class NearbySnapGPUicker {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    private readonly scene = new THREE.Scene();
    readonly nearbyTarget = new THREE.WebGLRenderTarget(this.radius * 2 * this.dpr, this.radius * 2 * this.dpr, { depthBuffer: true });
    private readonly nearbyBuffer: Readonly<Uint8Array> = new Uint8Array(this.radius * 2 * this.radius * 2 * this.dpr * this.dpr * 4);

    constructor(
        private readonly radius: number,
        private readonly pickingTarget: THREE.WebGLRenderTarget,
        private readonly viewport: Viewport) {
    }

    intersectObjects(objects: THREE.Points[]) {
        const { viewport: { renderer, camera }, scene, pickingTarget, nearbyTarget, nearbyBuffer, denormalizedScreenPoint, dpr, radius } = this;

        // Draw a bounding rectangle with x,y representing upper-left. It surrounds the mouse cursor by radius,radius
        const x = (denormalizedScreenPoint.x - radius * dpr) | 0;
        const y = (denormalizedScreenPoint.y + radius * dpr) | 0; // WebGL screen coordinatse are 0,0 in lower-left corner
        const x_dom = x;
        const y_dom = (renderer.domElement.height - denormalizedScreenPoint.y - radius * dpr) | 0; // DOM coordinates are 0,0 in upper-left corner

        this.scene.clear();
        for (const object of objects) scene.add(object);

        const oldRenderTarget = renderer.getRenderTarget();
        const oldAutoClearDepth = renderer.autoClearDepth;

        try {
            renderer.setRenderTarget(nearbyTarget);
            // nearbyTarget.depthTexture = pickingTarget.depthTexture;
            renderer.autoClearDepth = false;
            camera.setViewOffset(renderer.domElement.width, renderer.domElement.height, x_dom, y_dom, radius * 2 * dpr, radius * 2 * dpr); // takes DOM coordinates
            renderer.render(scene, camera);
            performance.mark('begin-nearby-snap-read-render-target-pixels')
            readRenderTargetPixelsAsync(renderer, nearbyTarget, 0, 0, radius * 2 * dpr, radius * 2 * dpr, nearbyBuffer).then(result => {
                performance.measure('nearby-snap-read-render-target-pixels', 'begin-nearby-snap-read-render-target-pixels');
            });
        } finally {
            renderer.setRenderTarget(oldRenderTarget);
            renderer.autoClearDepth = oldAutoClearDepth;
            camera.clearViewOffset();
        }

        const ids = new Uint32Array(nearbyBuffer.buffer);
        const set = new Set<number>();
        for (const id of ids) set.add(id); // NOTE: this is significantly faster than new Set(ids) for some reason;
        set.delete(0);
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
        // return 1;
        return this.viewport.renderer.getPixelRatio();
    }
}

const vertexColorLineMaterial = new LineVertexColorMaterial({ depthWrite: true });
