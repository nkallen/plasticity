import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Intersector, Mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { GizmoMaterial } from "../GizmoMaterials";
import { AbstractAxialScaleGizmo, AxisHelper, boxGeometry, CircularGizmo, CompositeHelper, DashedLineMagnitudeHelper, lineGeometry, MagnitudeStateMachine, PlanarGizmo } from "../MiniGizmos";
import { ScaleParams } from "./TranslateFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class ScaleGizmo extends CompositeGizmo<ScaleParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = this.materials.red;
    private readonly green = this.materials.green;
    private readonly blue = this.materials.blue;
    private readonly yellow = this.materials.yellow;
    private readonly magenta = this.materials.magenta;
    private readonly cyan = this.materials.cyan;
    private readonly x = new ScaleAxisGizmo("scale:x", this.editor, this.red);
    private readonly y = new ScaleAxisGizmo("scale:y", this.editor, this.green);
    private readonly z = new ScaleAxisGizmo("scale:z", this.editor, this.blue);
    private readonly xy = new PlanarScaleGizmo("scale:xy", this.editor, this.yellow);
    private readonly yz = new PlanarScaleGizmo("scale:yz", this.editor, this.cyan);
    private readonly xz = new PlanarScaleGizmo("scale:xz", this.editor, this.magenta);
    private readonly xyz = new CircleScaleGizmo("scale:xyz", this.editor);

    prepare() {
        const { x, y, z, xyz, xy, yz, xz, editor: { viewports }  } = this;
        for (const o of [x, y, z]) o.relativeScale.setScalar(0.8);
        for (const o of [xy, yz, xz]) o.relativeScale.setScalar(0.8);
        xyz.relativeScale.setScalar(0.85);

        this.add(x, y, z, xy, yz, xz, xyz);

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        yz.quaternion.setFromUnitVectors(Z, _X);
        xz.quaternion.setFromUnitVectors(Z, _Y);
    }

    private readonly _scale = new THREE.Vector3();

    execute(cb: (params: ScaleParams) => void, mode: Mode = Mode.Persistent | Mode.DisableSelection): CancellablePromise<void> {
        const { x, y, z, xy, yz, xz, xyz, params, _scale} = this;

        const set = () => {
            params.scale.set(
                xy.value * xz.value * x.value,
                xy.value * yz.value * y.value,
                xz.value * yz.value * z.value).multiplyScalar(xyz.value);
        }

        this.addGizmo(x, set);
        this.addGizmo(y, set);
        this.addGizmo(z, set);
        this.addGizmo(xy, set);
        this.addGizmo(yz, set);
        this.addGizmo(xz, set);
        this.addGizmo(xyz, set);

        return super.execute(cb, mode);
    }

    render(params: ScaleParams) {
        this.x.value = params.scale.x;
        this.y.value = params.scale.y;
        this.z.value = params.scale.z;
    }
}

export class CircleScaleGizmo extends CircularGizmo<number> {
    private denominator = 1;

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.white, new MagnitudeStateMachine(1));
        this.setup();
        this.render(this.state.current);
    }

    onPointerDown(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        const { pointStart2d, center2d } = info;
        this.denominator = pointStart2d.distanceTo(center2d);
        this.state.start();
    }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const { pointEnd2d, center2d } = info;

        const magnitude = this.state.original * pointEnd2d.distanceTo(center2d) / this.denominator!;
        this.state.current = magnitude;
        this.render(this.state.current);
        cb(this.state.current);
    }

    render(magnitude: number) {
        this.torus.scale.setScalar(magnitude);
        this.circle.scale.setScalar(magnitude);
    }
}

export class ScaleAxisGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(1);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(boxGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    readonly helper = new CompositeHelper([new DashedLineMagnitudeHelper(), new AxisHelper(this.material.line)]);
    protected readonly handleLength = 0;

    constructor(name: string, editor: EditorLike, protected readonly material: GizmoMaterial) {
        super(name, editor, material);
        this.add(this.helper);
        this.setup();
    }

    protected accumulate(original: number, dist: number, denom: number): number {
        return original * dist / denom;
    }
}

export class PlanarScaleGizmo extends PlanarGizmo<number> {
    readonly state = new MagnitudeStateMachine(1);
    readonly helper = new DashedLineMagnitudeHelper();

    onPointerMove(cb: (value: number) => void, intersect: Intersector, info: MovementInfo): void {
        const { plane, denominator, state } = this;

        const planeIntersect = intersect(plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        let magnitude = planeIntersect.point.sub(this.worldPosition).length();
        magnitude *= state.original;
        magnitude /= denominator;

        this.state.current = magnitude;
        this.render(magnitude);
        cb(magnitude);
    }

    render(magnitude: number) {
        this.handle.position.set(0.3 * magnitude, 0.3 * magnitude, 0);
        this.knob.position.copy(this.handle.position);
    }
}