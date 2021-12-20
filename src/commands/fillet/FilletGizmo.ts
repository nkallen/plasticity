import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import c3d from '../../../build/Release/c3d.node';
import { CurveEdgeSnap } from "../../editor/snaps/Snap";
import { CancellablePromise } from "../../util/CancellablePromise";
import { point2point, vec2vec } from "../../util/Conversion";
import { EditorLike, Mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxialScaleGizmo, AngleGizmo, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import * as fillet from './FilletFactory';
import { FilletParams } from './FilletFactory';

const Y = new THREE.Vector3(0, 1, 0);

export class FilletSolidGizmo extends CompositeGizmo<FilletParams> {
    private readonly main = new FilletMagnitudeGizmo("fillet-solid:distance", this.editor);
    private readonly angle = new FilletAngleGizmo("fillet-solid:angle", this.editor, this.editor.gizmos.white);
    private readonly variables: FilletMagnitudeGizmo[] = [];

    private mode: fillet.Mode = c3d.CreatorType.FilletSolid;

    constructor(params: FilletParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
    }

    execute(cb: (params: FilletParams) => void): CancellablePromise<void> {
        const { main, params, angle } = this;

        const { point, normal } = this.placement(this.hint);
        main.quaternion.setFromUnitVectors(Y, normal);
        main.position.copy(point);
        angle.position.copy(point);
        angle.visible = false;

        this.add(main);
        this.add(angle);

        angle.value = Math.PI / 4;

        this.addGizmo(main, length => {
            if (this.mode === c3d.CreatorType.ChamferSolid) {
                params.distance1 = length;
                params.distance2 = params.distance1 * Math.tan(angle.value);
            } else {
                params.distance = length;
            }
        });

        this.addGizmo(angle, angle => {
            if (this.mode !== c3d.CreatorType.ChamferSolid) throw new Error("invalid precondition");
            params.distance2 = params.distance1 * Math.tan(angle);
        });

        const result = super.execute(cb, Mode.Persistent);
        this.toggle(this.mode);
        return result;
    }

    toggle(mode: fillet.Mode) {
        this.mode = mode;
        const { angle, variables } = this;
        if (mode === c3d.CreatorType.ChamferSolid) {
            for (const variable of variables) {
                variable.visible = false;
                variable.stateMachine!.isEnabled = false;
            }
            angle.visible = true;
            angle.stateMachine!.isEnabled = true;
        } else if (mode === c3d.CreatorType.FilletSolid) {
            angle.visible = false;
            angle.stateMachine!.isEnabled = false
        }
    }

    prepare() {
        this.main.relativeScale.setScalar(0.8);
        this.angle.relativeScale.setScalar(0.3);
    }

    private placement(point?: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3 } {
        const { params: { edges }, editor: { db } } = this;
        const models = edges.map(view => db.lookupTopologyItem(view));
        const curveEdge = models[models.length - 1];

        if (point !== undefined) {
            const t = curveEdge.PointProjection(point2point(point))
            const normal = vec2vec(curveEdge.EdgeNormal(t), 1);
            const projected = point2point(curveEdge.Point(t));
            return { point: projected, normal };
        } else {
            const normal = vec2vec(curveEdge.EdgeNormal(0.5), 1);
            point = point2point(curveEdge.Point(0.5));
            return { point, normal };
        }
    }

    render(length: number) {
        this.main.render(length);
    }

    addVariable(point: THREE.Vector3, edge: c3d.CurveEdge, t: number): FilletMagnitudeGizmo {
        const normal = edge.EdgeNormal(t);
        const gizmo = new FilletMagnitudeGizmo(`fillet:distance:${this.variables.length}`, this.editor);
        gizmo.relativeScale.setScalar(0.5);
        gizmo.value = 1;
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(Y, vec2vec(normal, 1));
        this.variables.push(gizmo);

        return gizmo;
    }

    showEdges() {
        const solid = this.params.edges[0].parentItem;
        const view = solid.edges.slice(this.params.edges);
        view.material = this.editor.materials.lineDashed();
        view.computeLineDistances();
        this.editor.db.temporaryObjects.add(view);
    }

    get shouldRescaleOnZoom() {
        return false;
    }
}

export class FilletMagnitudeGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }

    get shouldRescaleOnZoom() { return true }

    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }
}

class FilletAngleGizmo extends AngleGizmo {
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }
}