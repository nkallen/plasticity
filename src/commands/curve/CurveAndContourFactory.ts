import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import MaterialDatabase from '../../MaterialDatabase';
import * as visual from "../../VisualModel";
import { GeometryFactory } from '../Factory';
import CurveFactory from "./CurveFactory";

export default class CurveAndContourFactory extends GeometryFactory {
    factories: CurveFactory[];

    readonly curves = new Array<{type: number, points: THREE.Vector3[]}>();

    private get currentFactory() { return this.factories[this.factories.length-1] }
    get points() { return this.currentFactory.points }
    get nextPoint() { return this.currentFactory.nextPoint }
    set nextPoint(p: THREE.Vector3 | undefined) { this.currentFactory.nextPoint = p}
    set type(t: number) { this.currentFactory.type = t}

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        this.factories = [new CurveFactory(db, materials, signals)];
    }

    push() {
        if (this.points.length < 2) throw new Error("invalid state");

        const { db, materials, signals } = this;

        const previousFactory = this.currentFactory;
        const currentFactory = new CurveFactory(db, materials, signals);
        this.factories.push(currentFactory);

        currentFactory.points.push(previousFactory.points[previousFactory.points.length-1]);
        currentFactory.nextPoint = previousFactory.nextPoint;
        previousFactory.nextPoint = undefined;
        previousFactory.update();
    }

    async doUpdate() {
        const { currentFactory } = this;

        currentFactory.update();
    }

    async doCommit() {
        const ps = [];
        for (const f of this.factories) {
            ps.push(f.commit() as Promise<visual.SpaceInstance<visual.Curve3D>>);
        }
        return Promise.all(ps);
    }

    doCancel() {
        for (const f of this.factories) {
            f.cancel();
        }
    }
}