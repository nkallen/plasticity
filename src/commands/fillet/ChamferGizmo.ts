import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { EditorLike, mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AngleGizmo } from "../MiniGizmos";
import { ChamferParams } from "./ChamferFactory";
import { MagnitudeGizmo } from "./FilletGizmo";

export class ChamferGizmo extends CompositeGizmo<ChamferParams> {
    private readonly distance = new MagnitudeGizmo("chamfer:distance", this.editor);
    private readonly angle = new AngleGizmo("chamfer:angle", this.editor, this.editor.gizmos.white);

    constructor(params: ChamferParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
    }

    prepare() {
        this.distance.relativeScale.setScalar(0.8);
        this.angle.relativeScale.setScalar(0.3);
    }

    execute(cb: (params: ChamferParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { distance, angle, params } = this;

        const { point, normal } = this.placement(this.hint);
        distance.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        distance.position.copy(point);
        angle.position.copy(point);

        this.add(distance);
        this.add(angle);

        angle.value = Math.PI / 4;

        this.addGizmo(distance, length => {
            params.distance1 = length;
            params.distance2 = params.distance1 * Math.tan(angle.value);
        });

        this.addGizmo(angle, angle => {
            params.distance2 = params.distance1 * Math.tan(angle);
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
        this.distance.render(length);
    }

    showEdges() {
        for (const edge of this.params.edges)
            this.editor.db.temporaryObjects.add(edge.occludedLine.clone());
    }

    get shouldRescaleOnZoom() {
        return false;
    }
}