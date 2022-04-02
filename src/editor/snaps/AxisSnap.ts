import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { Snap, ChoosableSnap, SnapProjection } from "./Snap";

const dotGeometry = new THREE.BufferGeometry();
dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
const dotMaterial = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false });
const lineSubtleMaterial = new THREE.LineDashedMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.15 });
const axisGeometry_line = new THREE.BufferGeometry();
const points = [];
points.push(new THREE.Vector3(0, -100_000, 0));
points.push(new THREE.Vector3(0, 100_000, 0));
axisGeometry_line.setFromPoints(points);
const axisGeometry_line2 = new LineGeometry();
axisGeometry_line2.setPositions([0, -100_000, 0, 0, 100_000, 0]);
export const axisSnapMaterial = new LineMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.1, dashed: true, dashScale: 100, dashSize: 100 });
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const lineBasicMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });
const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
const origin = new THREE.Vector3();


export class AxisSnap extends Snap implements ChoosableSnap {
    readonly snapper = new Line2(axisGeometry_line2, axisSnapMaterial);
    readonly helper: THREE.Object3D = new THREE.Line(axisGeometry_line, lineBasicMaterial);

    static X = new AxisSnap("X", new THREE.Vector3(1, 0, 0));
    static Y = new AxisSnap("Y", new THREE.Vector3(0, 1, 0));
    static Z = new AxisSnap("Z", new THREE.Vector3(0, 0, 1));

    readonly n = new THREE.Vector3();
    readonly o = new THREE.Vector3();
    private readonly orientation = new THREE.Quaternion();

    constructor(readonly name: string | undefined, n: THREE.Vector3, o = new THREE.Vector3(), z = n) {
        super();
        this.snapper.position.copy(o);
        this.snapper.quaternion.setFromUnitVectors(Y, n);
        this.helper.position.copy(this.snapper.position);
        this.helper.quaternion.copy(this.snapper.quaternion);

        this.n.copy(n).normalize();
        this.o.copy(o);
        this.orientation.setFromUnitVectors(Z, z);

        if (this.constructor === AxisSnap)
            this.init();
        // NOTE: All subclasses must call init()!
    }

    private readonly projection = new THREE.Vector3();
    private readonly intersectionPoint = new THREE.Vector3();
    project(point: THREE.Vector3) {
        const { n, o, orientation } = this;
        const { projection, intersectionPoint } = this;
        const position = projection.copy(n).multiplyScalar(n.dot(intersectionPoint.copy(point).sub(o))).add(o).clone();
        return { position, orientation };
    }

    protected readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return this.valid.copy(pt).sub(o).cross(n).lengthSq() < 10e-6;
    }

    move(delta: THREE.Vector3) {
        return new PointAxisSnap(this.name!.toLowerCase(), this.n, this.o.clone().add(delta));
    }

    rotate(quat: THREE.Quaternion) {
        const { o } = this;
        return new AxisSnap(this.name?.toLowerCase(), this.n.clone().applyQuaternion(quat), o);
    }

    private readonly plane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ color: 0x11111, side: THREE.DoubleSide }));
    private readonly eye = new THREE.Vector3();
    private readonly dir = new THREE.Vector3();
    private readonly align = new THREE.Vector3();
    private readonly matrix = new THREE.Matrix4();
    private readonly intersection = new THREE.Vector3();
    intersect(raycaster: THREE.Raycaster, info?: { position: THREE.Vector3; orientation: THREE.Quaternion; }): SnapProjection | undefined {
        const { eye, plane, align, dir, o, n, matrix, intersection } = this;

        eye.copy(raycaster.camera.position).sub(o).normalize();

        align.copy(eye).cross(n);
        dir.copy(n).cross(align);

        matrix.lookAt(origin, dir, align);
        plane.quaternion.setFromRotationMatrix(matrix);
        plane.position.copy(o);
        plane.updateMatrixWorld();

        const intersections = raycaster.intersectObject(plane);
        if (intersections.length === 0)
            return;

        const dist = intersections[0].point.sub(o).dot(n);
        const position = intersection.copy(n).multiplyScalar(dist).add(o);
        return { position, orientation: this.orientation };
    }
}

export class PointAxisSnap extends AxisSnap {
    private readonly sourcePointIndicator = new THREE.Points(dotGeometry, dotMaterial);

    constructor(readonly name: string, n: THREE.Vector3, position: THREE.Vector3) {
        super(name, n, position);
        const helper = this.helper as THREE.Line;
        helper.material = lineSubtleMaterial;
        helper.add(this.sourcePointIndicator);
        this.init();
    }

    get commandName(): string {
        return `snaps:set-${this.name.toLowerCase()}`;
    }
}

export class NormalAxisSnap extends PointAxisSnap {
    constructor(n: THREE.Vector3, o: THREE.Vector3) {
        super("Normal", n, o);
    }
}

export class LineAxisSnap extends AxisSnap {
    constructor(n: THREE.Vector3, position: THREE.Vector3) {
        super(undefined, n, position)
        this.init();
    }

    override isValid(pt: THREE.Vector3): boolean {
        const { n } = this;
        return Math.abs(pt.dot(n)) > 10e-6;
    }
}
