import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Intersector, mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxisGizmo, boxGeometry, CircularGizmo, DashedLineMagnitudeHelper, lineGeometry, MagnitudeStateMachine, PlanarGizmo } from "../MiniGizmos";
import { ScaleParams } from "./TranslateFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class ScaleGizmo extends CompositeGizmo<ScaleParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = { tip: this.materials.red, shaft: this.materials.lineRed };
    private readonly green = { tip: this.materials.green, shaft: this.materials.lineGreen };
    private readonly blue = { tip: this.materials.blue, shaft: this.materials.lineBlue };
    private readonly yellow = this.materials.yellowTransparent;
    private readonly magenta = this.materials.magentaTransparent;
    private readonly cyan = this.materials.cyanTransparent;
    private readonly x = new ScaleAxisGizmo("scale:x", this.editor, this.red);
    private readonly y = new ScaleAxisGizmo("scale:y", this.editor, this.green);
    private readonly z = new ScaleAxisGizmo("scale:z", this.editor, this.blue);
    private readonly xy = new PlanarScaleGizmo("scale:xy", this.editor, this.yellow);
    private readonly yz = new PlanarScaleGizmo("scale:yz", this.editor, this.cyan);
    private readonly xz = new PlanarScaleGizmo("scale:xz", this.editor, this.magenta);
    private readonly xyz = new CircleScaleGizmo("scale:xyz", this.editor);

    prepare() {
        const { x, y, z, xyz, xy, yz, xz } = this;
        for (const o of [x, y, z, xy, yz, xz]) o.relativeScale.setScalar(0.8);
        xyz.relativeScale.setScalar(0.85);
    }

    execute(cb: (params: ScaleParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, xy, yz, xz, xyz, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        yz.quaternion.setFromUnitVectors(Z, _X);
        xz.quaternion.setFromUnitVectors(Z, _Y);

        this.add(x, y, z, xy, yz, xz, xyz);

        const set = () => {
            params.scale.set(
                xy.value * xz.value * x.magnitude,
                xy.value * yz.value * y.magnitude,
                xz.value * yz.value * z.magnitude).multiplyScalar(xyz.value);
        }

        this.addGizmo(x, set);
        this.addGizmo(y, set);
        this.addGizmo(z, set);
        this.addGizmo(xy, set);
        this.addGizmo(yz, set);
        this.addGizmo(xz, set);
        this.addGizmo(xyz, set);

        return super.execute(cb, finishFast);
    }
}

export class CircleScaleGizmo extends CircularGizmo<number> {
    private denominator = 1;

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.line, new MagnitudeStateMachine(1));
        this.relativeScale.setScalar(0.7);
        this.render(this.state.current);
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
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
        this.scale.setScalar(magnitude);
        this.scale.multiply(this.relativeScale);
    }

    update(camera: THREE.Camera) {
        super.update(camera);
        this.scaleIndependentOfZoom(camera);
    }
}

export class ScaleAxisGizmo extends AbstractAxisGizmo {
    constructor(name: string, editor: EditorLike, material?: { tip: THREE.MeshBasicMaterial, shaft: LineMaterial }) {
        const materials = editor.gizmos;
        material ??= { tip: materials.yellow, shaft: materials.lineYellow }
        const tip = new THREE.Mesh(boxGeometry, material.tip);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, material.shaft);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        const helper = new DashedLineMagnitudeHelper();

        super(name, editor, { tip, knob, shaft, helper }, new MagnitudeStateMachine(1));
    }

    update(camera: THREE.Camera) {
        super.update(camera);
        this.scaleIndependentOfZoom(camera);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + sign * dist
    }
}

export class PlanarScaleGizmo extends PlanarGizmo<number> {
    constructor(name: string, editor: EditorLike, material?: THREE.MeshBasicMaterial) {
        const state = new MagnitudeStateMachine(1);
        const helper = new DashedLineMagnitudeHelper();
        super(name, editor, state, material, helper);
    }

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