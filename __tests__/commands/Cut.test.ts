import * as THREE from "three";
import { CutAndSplitFactory, CutFactory, SplitFactory } from '../../src/commands/boolean/CutFactory';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import * as visual from '../../src/visual_model/VisualModel';
import { PlaneSnap } from "../../src/editor/snaps/Snap";
import { db, materials, signals } from "./Boolean.test";

describe(CutFactory, () => {
    test('takes a cutting curve and a solid and produces a divided solid', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        const curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const cut = new CutFactory(db, materials, signals);
        cut.solid = sphere;
        cut.curve = curve;
        const result = await cut.commit() as visual.SpaceItem[];

        expect(result.length).toBe(2);
    });

    test('works with lines', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const cut = new CutFactory(db, materials, signals);
        cut.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        cut.solid = sphere;
        cut.curve = line;
        const result = await cut.commit() as visual.SpaceItem[];

        expect(result.length).toBe(2);
    });

    test('works with faces', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 2;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;

        const cut = new CutFactory(db, materials, signals);
        cut.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        cut.solid = sphere;
        cut.plane = box.faces.get(0);
        const result = await cut.commit() as visual.SpaceItem[];

        expect(result.length).toBe(2);
    });
});
describe(SplitFactory, () => {
    test('cuts faces', async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        expect([...box.faces].length).toBe(6);

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const split = new SplitFactory(db, materials, signals);
        split.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        split.faces = [box.faces.get(0)];
        split.curve = line;
        const result = await split.commit() as visual.Solid;

        expect([...result.faces].length).toBe(7);
    });

});
describe(CutAndSplitFactory, () => {
    test('cuts faces', async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        expect([...box.faces].length).toBe(6);

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const split = new CutAndSplitFactory(db, materials, signals);
        split.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        split.faces = [box.faces.get(0)];
        split.curve = line;
        const results = await split.commit() as visual.Solid[];
        const result = results[0];

        expect([...result.faces].length).toBe(7);
    });

    test('works with lines', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const cut = new CutAndSplitFactory(db, materials, signals);
        cut.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        cut.solid = sphere;
        cut.curve = line;
        const result = await cut.commit() as visual.SpaceItem[];

        expect(result.length).toBe(2);
    });
});
