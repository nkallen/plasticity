import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { EditorLike, mode } from "../AbstractGizmo";
import { CompositeGizmo, DistanceGizmo } from "../MiniGizmos";
import { ChamferParams } from "./ChamferFactory";

export class ChamferGizmo extends CompositeGizmo<ChamferParams> {
    private readonly main = new DistanceGizmo("chamfer:distance", this.editor);
    private readonly variable: DistanceGizmo[] = [];

    constructor(params: ChamferParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
    }

    execute(cb: (params: ChamferParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { main, params } = this;

        const { point, normal } = this.placement(this.hint);
        main.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        main.position.copy(point);

        this.add(main);

        this.addGizmo(main, length => {
            params.distance = length;
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

    showEdges() {
        for (const edge of this.params.edges)
            this.editor.db.temporaryObjects.add(edge.occludedLine.clone());
    }
}