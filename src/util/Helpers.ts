import { HasSelection, SelectionManager } from '../selection/SelectionManager';
import * as THREE from 'three';
import { EditorSignals } from '../Editor';
import { OffsetFaceGizmo } from '../commands/modifyface/OffsetFaceGizmo';
import * as gizmo from '../commands/AbstractGizmo';
import { CancellablePromise } from './Cancellable';
import ExtrudeFactory, { ExtrudeFactory2 } from '../commands/extrude/ExtrudeFactory';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';

// Helpers are little visualization tools like gizmos that should
// be rendered as a separate pass from the main scene.

export interface EditorLike extends gizmo.EditorLike {
    db: GeometryDatabase;
    materials: MaterialDatabase;
}

export interface Helper extends THREE.Object3D {
    update(camera: THREE.Camera): void;
}

export class Helpers {
    readonly scene = new THREE.Scene();
    private p?: CancellablePromise<void>;

    constructor(signals: EditorSignals, private readonly editor: EditorLike) {
        this.update = this.update.bind(this);
        this.selectionChanged = this.selectionChanged.bind(this);

        signals.renderPrepared.add(({ camera }) => this.update(camera));
        signals.selectionChanged.add(({ selection, point }) => this.selectionChanged(selection, point));
    }

    add(...object: Helper[]) {
        this.scene.add(...object);
    }

    remove(...object: Helper[]) {
        this.scene.remove(...object);
    }

    update(camera: THREE.Camera) {
        for (const child of this.scene.children) {
            const helper = child as Helper;
            helper.update(camera);
        }
    }

    private selectionChanged(selection: HasSelection, point?: THREE.Vector3) { // OK so we would like the click position
        const { editor } = this;
        const normal = new THREE.Vector3(0, 0, 1);
        this.p?.cancel();
        if (selection.selectedRegions.size > 0) {
            const region = [...selection.selectedRegions][0];
            const extrude = new ExtrudeFactory2(this.editor.db, this.editor.materials, this.editor.signals);
            extrude.region = region;
            extrude.direction = normal;
            const gizmo = new OffsetFaceGizmo(editor, point ?? new THREE.Vector3(), normal);
            const p = gizmo.execute(delta => {
                console.log(delta);
                extrude.distance1 = delta;
                extrude.update();
            });
            p.then(
                () => { },
                () => { })
            this.p = p;
        }
    }
}