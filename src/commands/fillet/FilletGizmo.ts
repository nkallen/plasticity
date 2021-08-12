import * as THREE from "three";
import { CurveEdgeSnap } from "../../editor/SnapManager";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { EditorLike, mode } from "../AbstractGizmo";
import { DistanceGizmo } from "../MiniGizmos";
import { CompositeGizmo } from "../CompositeGizmo";
import { FilletParams } from './FilletFactory';

export class FilletGizmo extends CompositeGizmo<FilletParams> {
    private readonly main = new DistanceGizmo("fillet:distance", this.editor);
    private readonly variable: DistanceGizmo[] = [];

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

    addVariable(point: THREE.Vector3, snap: CurveEdgeSnap): DistanceGizmo {
        const { model, t } = snap;

        const normal = model.EdgeNormal(t);
        const gizmo = new DistanceGizmo(`fillet:distance:${this.variable.length}`, this.editor);
        gizmo.relativeScale.setScalar(0.5);
        gizmo.magnitude = 1;
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec2vec(normal));
        this.variable.push(gizmo);

        return gizmo;
    }

    showEdges() {
        for (const edge of this.params.edges)
            this.editor.db.temporaryObjects.add(edge.occludedLine.clone());
    }
}