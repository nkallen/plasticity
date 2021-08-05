import { Helper } from "../../util/Helpers";
import * as THREE from "three";
import { Cancel, CancellablePromise } from "../../util/Cancellable";
import { EditorLike, GizmoLike, mode } from "../AbstractGizmo";
import { AngleGizmo, DistanceGizmo, LengthGizmo } from "../MiniGizmos";
import { ExtrudeParams } from "./ExtrudeFactory";
import { CompositeDisposable, Disposable } from "event-kit";

export abstract class CompositeGizmo<P> extends THREE.Group implements GizmoLike<(p: P) => void>, Helper {
    private readonly gizmos: [(GizmoLike<any> & Helper), (a: any) => void][] = [];

    constructor(protected readonly params: P, protected readonly editor: EditorLike) {
        super();
    }

    execute(compositeCallback: (params: P) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const disposables = new CompositeDisposable();

        this.editor.helpers.add(this);
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        const p = new CancellablePromise<void>((resolve, reject) => {
            const cancel = () => {
                disposables.dispose();
                reject(Cancel);
            }
            const finish = () => {
                disposables.dispose();
                resolve();
            }
            return { cancel, finish };
        });

        const cancellables = [];
        for (const [gizmo, miniCallback] of this.gizmos) {
            const executingGizmo = gizmo.execute((x: any) => {
                miniCallback(x);
                compositeCallback(this.params);
            }, finishFast);
            cancellables.push(executingGizmo);
        }

        return CancellablePromise.all([p, ...cancellables]);
    }

    addGizmo<T>(gizmo: GizmoLike<(t: T) => void> & Helper, cb: (t: T) => void) {
        this.gizmos.push([gizmo, cb]);
    }

    update(camera: THREE.Camera) {
        for (const [gizmo,] of this.gizmos) gizmo.update(camera);
    }
}


export class ExtrudeGizmo extends CompositeGizmo<ExtrudeParams> {
    private readonly race1Gizmo = new AngleGizmo("extrude:race1", this.editor);
    private readonly distance1Gizmo = new DistanceGizmo("extrude:distance1", this.editor);
    private readonly race2Gizmo = new AngleGizmo("extrude:race2", this.editor);
    private readonly distance2Gizmo = new DistanceGizmo("extrude:distance2", this.editor);
    private readonly thicknessGizmo = new LengthGizmo("extrude:thickness", this.editor);

    execute(cb: (params: ExtrudeParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { race1Gizmo, distance1Gizmo, race2Gizmo, distance2Gizmo, thicknessGizmo, params } = this;

        distance2Gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
        thicknessGizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));

        this.add(distance1Gizmo, distance2Gizmo, thicknessGizmo);

        thicknessGizmo.length = 0;

        race1Gizmo.scale.setScalar(0.3);
        race2Gizmo.scale.setScalar(0.3);

        distance1Gizmo.tip.add(race1Gizmo);
        distance2Gizmo.tip.add(race2Gizmo);

        this.addGizmo(distance1Gizmo, length => {
            params.distance1 = length;
        });

        this.addGizmo(race1Gizmo, angle => {
            params.race1 = angle;
        });

        this.addGizmo(distance2Gizmo, length => {
            params.distance2 = length;
        });

        this.addGizmo(race2Gizmo, angle => {
            params.race2 = angle;
        });

        this.addGizmo(thicknessGizmo, thickness => {
            params.thickness1 = params.thickness2 = thickness;
        });

        return super.execute(cb, finishFast);
    }
}