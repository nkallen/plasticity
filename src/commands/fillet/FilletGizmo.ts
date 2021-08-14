import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CurveEdgeSnap } from "../../editor/SnapManager";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { AbstractGizmo, EditorLike, Intersector, mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { GizmoMaterial } from "../GizmoMaterials";
import { AbstractAxialScaleGizmo, AbstractAxisGizmo, DashedLineMagnitudeHelper, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
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

export class MagnitudeGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }

    get shouldRescaleOnZoom() { return true }
}