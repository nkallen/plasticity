import * as THREE from "three";
import { Editor } from "./Editor";
import { CurveEdge, Edge, Item, VisualModel } from "./VisualModel";
import c3d from '../build/Release/c3d.node';
import { Object3D } from "three";

export class SnapManager {
    private readonly editor: Editor;
    private readonly snaps = new Set<Snap>();

    private readonly begPoints = new Set<Snap>();
    private readonly midPoints = new Set<Snap>();

    pickers: Object3D[];
    snappers: Object3D[];

    constructor(editor: Editor) {
        this.editor = editor;
        this.snaps.add(new PointSnap());
        this.snaps.add(new AxisSnap(new THREE.Vector3(1, 0, 0)));
        this.snaps.add(new AxisSnap(new THREE.Vector3(0, 1, 0)));
        this.snaps.add(new AxisSnap(new THREE.Vector3(0, 0, 1)));

        this.update();
    }

    private update() {
        const all = [...this.snaps, ...this.begPoints, ...this.midPoints];
        this.pickers = all.map((s) => s.picker);
        this.snappers = all.map((s) => s.snapper);
    }

    add(item: VisualModel) {
        if (item instanceof Item) {
            for (const edge of item.edges) {
                this.addEdge(edge);
            }
        }

        this.update();
    }

    addEdge(edge: CurveEdge) {
        const model = this.editor.lookupTopologyItem(edge) as c3d.Edge;
        const begPt = model.GetBegPoint();
        const begSnap = new PointSnap(begPt.x, begPt.y, begPt.z);
        this.begPoints.add(begSnap);

        const midPt = model.Point(0.5);
        const midSnap = new PointSnap(midPt.x, midPt.y, midPt.z);
        this.midPoints.add(midSnap);

        edge.snaps.add(midSnap);
        edge.snaps.add(begSnap);
    }

    delete(item: VisualModel) {
        if (item instanceof Item) {
            for (const edge of item.edges) {
                for (const snap of edge.snaps) {
                    this.begPoints.delete(snap);
                    this.midPoints.delete(snap);
                }
            }
        }

        this.update();
    }
}

export abstract class Snap {
    snapper: THREE.Object3D;
    picker: THREE.Object3D

    constructor(snapper: THREE.Object3D, picker: THREE.Object3D) {
        snapper.userData.snap = this;
        picker.userData.snap = this;
        snapper.updateMatrixWorld();
        picker.updateMatrixWorld();

        this.snapper = snapper;
        this.picker = picker;
    }

    abstract project(intersection: THREE.Intersection): THREE.Vector3;
}

export class PointSnap extends Snap {
    private readonly projection: THREE.Vector3;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        const snapper = new THREE.Mesh(new THREE.SphereGeometry(0.1));
        const picker = new THREE.Mesh(new THREE.SphereGeometry(0.5));
        snapper.position.set(x, y, z);
        picker.position.set(x, y, z);

        super(snapper, picker);
        this.projection = new THREE.Vector3(x, y, z);
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return this.projection;
    }
}

export class AxisSnap extends Snap {
    constructor(n: THREE.Vector3) {
        n = n.normalize().multiplyScalar(1000);
        const points = [-n.x, -n.y, -n.z, n.x, n.y, n.z];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const snapper = new THREE.Line(geometry);
        const picker = snapper;

        super(snapper, picker);
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return intersection.point;
    }
}