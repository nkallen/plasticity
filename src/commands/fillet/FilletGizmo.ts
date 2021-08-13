import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CurveEdgeSnap } from "../../editor/SnapManager";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { AbstractGizmo, EditorLike, Intersector, mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { DashedLineMagnitudeHelper, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import { FilletParams } from './FilletFactory';

export class FilletGizmo extends CompositeGizmo<FilletParams> {
    private readonly main = new MagnitudeGizmo("fillet:distance", this.editor);
    private readonly variable: MagnitudeGizmo[] = [];

    constructor(params: FilletParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
    }

    execute(cb: (params: FilletParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { main, params } = this;

        const { point, normal } = this.placement(this.hint);
        main.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        main.position.copy(point);

        this.add(main);

        this.addGizmo(main, length => {
            params.distance1 = length;
        });

        return super.execute(cb, finishFast);
    }

    prepare() {
        this.main.relativeScale.setScalar(0.8);
    }

    private placement(point?: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3 } {
        const { params: { edges }, editor: { db } } = this;
        const models = edges.map(view => db.lookupTopologyItem(view));
        const curveEdge = models[models.length - 1];

        if (point !== undefined) {
            const t = curveEdge.PointProjection(vec2cart(point))
            const normal = vec2vec(curveEdge.EdgeNormal(t));
            const projected = cart2vec(curveEdge.Point(t));
            return { point: projected, normal };
        } else {
            const normal = vec2vec(curveEdge.EdgeNormal(0.5));
            point = cart2vec(curveEdge.Point(0.5));
            return { point, normal };
        }
    }

    render(length: number) {
        this.main.render(length);
    }

    addVariable(point: THREE.Vector3, snap: CurveEdgeSnap): MagnitudeGizmo {
        const { model, t } = snap;

        const normal = model.EdgeNormal(t);
        const gizmo = new MagnitudeGizmo(`fillet:distance:${this.variable.length}`, this.editor);
        gizmo.relativeScale.setScalar(0.5);
        gizmo.value = 1;
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec2vec(normal));
        this.variable.push(gizmo);

        return gizmo;
    }

    showEdges() {
        for (const edge of this.params.edges)
            this.editor.db.temporaryObjects.add(edge.occludedLine.clone());
    }

    get shouldRescaleOnZoom() {
        return false;
    }
}

// This gizmo is like the distance gizmo but it doesn't just go in one direction.
export class MagnitudeGizmo extends AbstractGizmo<(mag: number) => void> {
    readonly state = new MagnitudeStateMachine(0);
    protected readonly material = this.editor.gizmos.default;
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    readonly helper = new DashedLineMagnitudeHelper();

    private denominator = 1;

    constructor(
        private readonly longName: string,
        editor: EditorLike,
    ) {
        super(longName.split(':')[0], editor);
        this.state.min = 0;
        this.setup();
    }

    private setup() {
        this.knob.userData.command = [`gizmo:${this.longName}`, () => { }];
        this.tip.position.set(0, 1, 0);
        this.knob.position.copy(this.tip.position);
        this.render(this.state.current);

        this.handle.add(this.tip, this.shaft);
        this.picker.add(this.knob);
    }

    get value() { return this.state.current }
    set value(mag: number) {
        this.state.original = mag;
        this.render(this.state.current)
    }

    onInterrupt(cb: (radius: number) => void) {
        this.state.revert();
        cb(this.state.current);
    }

    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        const { pointStart2d, center2d } = info;
        this.denominator = pointStart2d.distanceTo(center2d);
        this.state.start();
    }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const { pointEnd2d, center2d } = info;

        const magnitude = this.state.original + pointEnd2d.distanceTo(center2d) - this.denominator;
        this.state.current = magnitude;
        this.render(this.state.current);
        cb(this.state.current);
    }

    render(length: number) {
        this.shaft.scale.y = length + 1;
        this.tip.position.set(0, length + 1, 0);
        this.knob.position.copy(this.tip.position);
    }

    get shouldRescaleOnZoom() { return true }
}