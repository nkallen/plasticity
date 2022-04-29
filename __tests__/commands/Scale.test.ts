import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterBoxFactory } from "../../src/commands/box/BoxFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { ProjectCurveFactory, ProjectingBasicScaleFactory, ProjectingFreestyleScaleFactory } from "../../src/commands/translate/ProjectCurveFactory";
import { BasicScaleFactory, FreestyleScaleFactory } from '../../src/commands/translate/TranslateItemFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { SolidCopier } from "../../src/editor/SolidCopier";
import { inst2curve } from "../../src/util/Conversion";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let box: visual.Solid;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
})

const center = new THREE.Vector3();
const bbox = new THREE.Box3();

beforeEach(async () => {
    const makeBox = new CenterBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 1, 0);
    makeBox.p3 = new THREE.Vector3(0, 0, 1);
    box = await makeBox.commit() as visual.Solid;
});

describe(BasicScaleFactory, () => {
    let scale: BasicScaleFactory;
    beforeEach(() => {
        scale = new BasicScaleFactory(db, materials, signals);
    })

    test('update', async () => {
        scale.items = [box];
        scale.pivot = new THREE.Vector3();
        scale.scale = new THREE.Vector3(2, 2, 2);
        expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
        await scale.update();
        expect(box.scale).toEqual(new THREE.Vector3(2, 2, 2));
    });

    test('commit', async () => {
        scale.items = [box];
        scale.pivot = new THREE.Vector3();
        scale.scale = new THREE.Vector3(2, 2, 2);
        expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
        const scaleds = await scale.commit() as visual.Solid[];
        bbox.setFromObject(scaleds[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 2));
    });

    test('update & commit resets scale of original visual item', async () => {
        scale.items = [box];
        scale.pivot = new THREE.Vector3();
        scale.scale = new THREE.Vector3(2, 2, 2);

        await scale.update();
        expect(box.scale).toEqual(new THREE.Vector3(2, 2, 2));

        await scale.commit();
        expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
    })

    describe("when no values given it doesn't fail", () => {
        test('update', async () => {
            scale.items = [box];
            await scale.update();
            expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
        });
    });
})

describe(FreestyleScaleFactory, () => {
    let scale: FreestyleScaleFactory;
    beforeEach(() => {
        scale = new FreestyleScaleFactory(db, materials, signals);
    })

    test('it works', async () => {
        scale.items = [box];
        scale.from(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
        scale.to(new THREE.Vector3(), new THREE.Vector3(2, 0, 0));

        expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
        const scaleds = await scale.commit() as visual.Solid[];
        bbox.setFromObject(scaleds[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 1));
    });
});

describe(ProjectCurveFactory, () => {
    let curve: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.type = c3d.SpaceType.Polyline3D;

        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(1, 0, 1));
        makeCurve.points.push(new THREE.Vector3(2, 2, -1));
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(curve))!;
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(curve);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    });

    let projectCurve: ProjectCurveFactory;

    beforeEach(() => {
        projectCurve = new ProjectCurveFactory(db, materials, signals);
    })

    test('it works', async () => {
        projectCurve.curves = [curve];
        projectCurve.origin = new THREE.Vector3(0, 0, 1);
        projectCurve.normal = new THREE.Vector3(0, 0, 1);
        const flattened = await projectCurve.commit() as visual.SpaceInstance<visual.Curve3D>[];

        bbox.setFromObject(flattened[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 1));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    })
});

describe(ProjectingBasicScaleFactory, () => {
    let curve: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.type = c3d.SpaceType.Polyline3D;

        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(1, 0, 1));
        makeCurve.points.push(new THREE.Vector3(2, 2, -1));
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(curve))!;
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(curve);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    });

    let projectCurve: ProjectingBasicScaleFactory;

    beforeEach(() => {
        projectCurve = new ProjectingBasicScaleFactory(db, materials, signals);
    })

    test('when scale is 0', async () => {
        projectCurve.items = [curve];
        projectCurve.pivot = new THREE.Vector3(0, 0, 1);
        projectCurve.scale = new THREE.Vector3(1, 1, 0);
        const flattened = await projectCurve.commit() as visual.SpaceInstance<visual.Curve3D>[];

        bbox.setFromObject(flattened[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 1));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    });

    test('with curves and solids', async () => {
        projectCurve.items = [curve, box];
        projectCurve.pivot = new THREE.Vector3(0, 0, 1);
        projectCurve.scale = new THREE.Vector3(1, 1, 0.5);
        const flattened = await projectCurve.commit() as visual.SpaceInstance<visual.Curve3D>[];

        const curev = flattened[0];
        bbox.setFromObject(curev);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));

        const solid = flattened[1];
        bbox.setFromObject(solid);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.75));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0.5));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });
});


describe(ProjectingFreestyleScaleFactory, () => {
    let curve: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.type = c3d.SpaceType.Polyline3D;

        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(1, 0, 1));
        makeCurve.points.push(new THREE.Vector3(2, 2, -1));
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(curve))!;
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(curve);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    });

    let projectCurve: ProjectingFreestyleScaleFactory;

    beforeEach(() => {
        projectCurve = new ProjectingFreestyleScaleFactory(db, materials, signals);
    })

    test('when scale is 0', async () => {
        projectCurve.items = [curve];
        projectCurve.from(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        projectCurve.to(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
        const flattened = await projectCurve.commit() as visual.SpaceInstance<visual.Curve3D>[];

        bbox.setFromObject(flattened[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    });

    test('when scale is not 0', async () => {
        projectCurve.items = [box];
        projectCurve.from(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
        projectCurve.to(new THREE.Vector3(), new THREE.Vector3(2, 0, 0));

        expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
        const scaleds = await projectCurve.commit() as visual.Solid[];
        bbox.setFromObject(scaleds[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 1));
    });
});