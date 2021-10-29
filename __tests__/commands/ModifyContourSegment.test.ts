import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterPointArcFactory, ThreePointArcFactory } from "../../src/commands/arc/ArcFactory";
import { ContourFilletFactory } from "../../src/commands/modify_contour/ContourFilletFactory";
import JoinCurvesFactory from "../../src/commands/curve/JoinCurvesFactory";
import { ContourRebuilder, ModifyContourSegmentFactory, OffsetPrecomputeRadiusInfo, OffsetResult } from "../../src/commands/modify_contour/ModifyContourSegmentFactory";
import LineFactory from '../../src/commands/line/LineFactory';
import { CornerRectangleFactory } from "../../src/commands/rect/RectangleFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { inst2curve, polyline2contour } from "../../src/util/Conversion";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

let modifyContour: ModifyContourSegmentFactory;
beforeEach(() => {
    modifyContour = new ModifyContourSegmentFactory(db, materials, signals);
});

let contour: visual.SpaceInstance<visual.Curve3D>;
const bbox = new THREE.Box3();
const center = new THREE.Vector3();

describe('A triangle', () => {
    /**
     * A triangle of this form, with segments anticlockwise (as labeled):
     * 
     *    1
     *   +--+
     * 2 | / 0
     *   |/
     */

    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine3 = new LineFactory(db, materials, signals);
        makeLine3.p1 = new THREE.Vector3();
        makeLine3.p2 = new THREE.Vector3(0, 1, 0);
        const line3 = await makeLine3.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        makeContour.push(line3);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
    });

    it('allows offsetting a middle line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    });

    it('offsetting the first line works', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segment = 0;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1.207, -0.207, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1.414, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.414, 1, 0));
    });

    it('ContourRebuilder first line', () => {
        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        const before_extended = model.GetSegments()[2];
        const active_new = model.GetSegments()[0];
        const after_extended = model.GetSegments()[1];
        const result = { before_extended, active_new, after_extended, radius: 0 } as unknown as OffsetResult;
        const info = { radiusBefore: 0, radiusAfter: 0 };
        const { ordered } = ContourRebuilder.calculate(0, model.GetSegments(), true, result, info);
        expect(ordered.length).toBe(3);
        expect(ordered[0]).toBe(active_new);
        expect(ordered[1]).toBe(after_extended);
        expect(ordered[2]).toBe(before_extended);
    })

    it('offsetting the last line works', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = -1;
        modifyContour.segment = 2;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });

    describe('a triangle with a fillet (on the bottom)', () => {
        /**
         * Bottom is filletted
         * 
         *    1
         *   +---+
         * 2 |  / 0
         *   | /
         *    u
         */
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[2] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(3);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            const bbox = new THREE.Box3().setFromObject(filleted);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.57, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);
        })

        it('allows offsetting a line NOT adjacent to the fillet, preserving everything else', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 1;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1.07, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });

        it('allows offsetting a line after a fillet (but the line is the first segment), modifying the fillet appropriately', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 0;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1.207, -0.136, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1.272, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.414, 1, 0));
        });

        it('allows offsetting a line before a fillet, modifying the fillet appropriately', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 2;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.0707, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -0.858, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        });

        it('ContourRebuilder index=2', () => {
            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            const segments = model.GetSegments();
            const before_extended = segments[1];
            const active_new = segments[2];
            const after_extended = segments[0];
            const result = { before_extended, active_new, after_extended, radius: 0 } as OffsetResult;
            const info = { radiusBefore: 0, radiusAfter: 0.1 };
            const { ordered, radiuses } = ContourRebuilder.calculate(2, segments, true, result, info);
            expect(ordered.length).toBe(3);
            expect(ordered[0]).toBe(segments[0]);
            expect(ordered[1]).toBe(segments[1]);
            expect(ordered[2]).toBe(segments[2]);

            expect(radiuses).toEqual([0, 0, 0.1]);
        })

        it('allows offsetting the fillet', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -0.1;
            modifyContour.segment = 3;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.535, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.07, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        });

        it('allows removing the fillet', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -100;
            modifyContour.segment = 3;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(3);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        });

    });


    describe('a triangle with two fillets (bottom & top left)', () => {
        // Bottom and top left are filletted
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[1] = 0.1;
            makeFillet.radiuses[2] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(3);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            const bbox = new THREE.Box3().setFromObject(filleted);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.57, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);
        })

        it('allows offsetting a line adjacent to one fillet, preserving everything else', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 1;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1.07, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.141, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });

        it('allows offsetting the first segment (which, because closed, is after the last segment)', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 0;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1.2, -0.136, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1.27, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.41, 1, 0));
        });

        it('allows offsetting the third segment', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 3;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.070, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -0.858, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        });

    });


    describe('a triangle with three fillets', () => {
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[0] = 0.1;
            makeFillet.radiuses[1] = 0.1;
            makeFillet.radiuses[2] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(3);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            const bbox = new THREE.Box3().setFromObject(filleted);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.429, 0.57, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.858, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(6);
        })

        it('ContourRebuilder index=0', () => {
            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            const segments = model.GetSegments();
            const before_extended = segments[0];
            const active_new = segments[2];
            const after_extended = segments[4];
            const result = { before_extended, active_new, after_extended, radius: 0 } as OffsetResult;
            const info = { radiusBefore: 0.1, radiusAfter: 0.1 };
            const { ordered } = ContourRebuilder.calculate(0, [
                active_new, segments[3], after_extended, segments[5], before_extended, segments[1]
            ], true, result, info);
            expect(ordered.length).toBe(4);
            expect(ordered[0]).toBe(active_new);
            expect(ordered[1]).toBe(after_extended);
            expect(ordered[2]).toBe(segments[5]);
            expect(ordered[3]).toBe(before_extended);
        })

        it('ContourRebuilder index=5', () => {
            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            const segments = model.GetSegments();
            const before_extended = segments[0];
            const active_new = segments[2];
            const after_extended = segments[4];
            const result = { before_extended, active_new, after_extended, radius: 0 } as OffsetResult;
            const info = { radiusBefore: 0.1, radiusAfter: 0.1 };
            const { ordered, radiuses } = ContourRebuilder.calculate(5, [
                segments[3], after_extended, segments[5], before_extended, segments[1], active_new,
            ], true, result, info);
            expect(ordered.length).toBe(4);
            expect(ordered[0]).toBe(after_extended);
            expect(ordered[1]).toBe(segments[5]);
            expect(ordered[2]).toBe(before_extended);
            expect(ordered[3]).toBe(active_new);

            expect(radiuses).toEqual([0, 0, 0.1, 0.1]);
        })
    });

});

describe('A rectangle', () => {
    /**
     *       1
     *      ___
     *  0  |   | 2
     *     |___|
     * 
     *       3
     */
    beforeEach(async () => {
        const makeRectangle = new CornerRectangleFactory(db, materials, signals);
        makeRectangle.p1 = new THREE.Vector3(-1, -1, 0);
        makeRectangle.p2 = new THREE.Vector3(1, 1, 0);
        contour = await makeRectangle.commit() as visual.SpaceInstance<visual.Curve3D>;
        const model = db.lookup(contour);
        const polyline = inst2curve(model) as c3d.Polyline3D;
        contour = await db.addItem(new c3d.SpaceInstance(await polyline2contour(polyline)));

        const bbox = new THREE.Box3().setFromObject(contour);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });

    describe('with a fillet', () => {
        /**
         *       1
         *      ___.
         *  0  |   | 2
         *     |___|
         * 
         *       3
         */

        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[1] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(4);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(filleted);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);
        })

        it('offsets the first segment', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 0;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        });

        it('offsets the first segment', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 3;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
        });

    });

    describe('with two fillets', () => {
        /**
         *       1
         *     .___.
         *  0  |   | 2
         *     |___|
         * 
         *       3
         */
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[0] = 0.1;
            makeFillet.radiuses[1] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(4);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(filleted);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(6);
        });

        it('offsets the first segment', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 0;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(6);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        });
    });
});


describe('Two intersecting lines', () => {
    /**
     *    1
     *    --+
     *     / 0
     *    /
     */

    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });

    it('segmentAngles', () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segment = 0;
        const segmentAngles = modifyContour.segmentAngles;
        expect(segmentAngles[0].origin).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(segmentAngles[0].normal).toApproximatelyEqual(new THREE.Vector3(Math.SQRT1_2, -Math.SQRT1_2, 0));
        expect(segmentAngles[1].origin).toApproximatelyEqual(new THREE.Vector3(0.5, 1, 0));
        expect(segmentAngles[1].normal).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
    })

    it('allows offsetting a first line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segment = 0;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1.207, 0.146, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -0.707, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.414, 1, 0));
    });

    it('allows offsetting a second line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    });

    it('ContourRebuilder second line', () => {
        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        const before_extended = model.GetSegments()[0];
        const active_new = model.GetSegments()[1];
        const result = { before_extended, active_new, after_extended: undefined, radius: 0 } as unknown as OffsetResult;
        const info = { radiusBefore: 0, radiusAfter: 0 };
        const { ordered } = ContourRebuilder.calculate(1, model.GetSegments(), false, result, info);
        expect(ordered.length).toBe(2);
        expect(ordered[0]).toBe(before_extended);
        expect(ordered[1]).toBe(active_new);
    })

    describe('with fillet on the right', () => {
        /**
         *    1
         *    --.
         *     / 0
         *    /
         */
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[0] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(1);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            const bbox = new THREE.Box3().setFromObject(filleted);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.429, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.85, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(3);
        });

        it('allows offsetting a first line', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -1;
            modifyContour.segment = 0;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(3);
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1.136, 0.146, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -0.707, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.272, 1, 0));
        });

        it('allows offsetting a second line', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = 1;
            modifyContour.segment = 2;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(3);
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.929, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.858, 2, 0));
        });

    });
});

describe('A trapezoid', () => {
    /**
     * A trapezoid of this form, with segments anticlockwise (as labeled):
     * 
     *    2
     *   +--+
     * 3 |   \ 1
     *   |____\
     *      0
     */

    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(2, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(2, 0, 0);
        makeLine2.p2 = new THREE.Vector3(1, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine3 = new LineFactory(db, materials, signals);
        makeLine3.p1 = new THREE.Vector3(1, 1, 0);
        makeLine3.p2 = new THREE.Vector3(0, 1, 0);
        const line3 = await makeLine3.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine4 = new LineFactory(db, materials, signals);
        makeLine4.p1 = new THREE.Vector3(0, 1, 0);
        makeLine4.p2 = new THREE.Vector3();
        const line4 = await makeLine4.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        makeContour.push(line3);
        makeContour.push(line4);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(4);
    });

    it('allows offsetting the top', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segment = 2;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(4);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    });
});

describe('Arc:Line:Arc', () => {
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3(-1, 0, 0);
        makeArc1.p2 = new THREE.Vector3(-2, 0, 0);
        makeArc1.p3 = new THREE.Vector3();
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc2 = new CenterPointArcFactory(db, materials, signals);
        makeArc2.center = new THREE.Vector3(2, 0, 0);
        makeArc2.p2 = new THREE.Vector3(1, 0, 0);
        makeArc2.p3 = new THREE.Vector3(3, 0, 0);
        const arc2 = await makeArc2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(arc1);
        makeContour.push(line1);
        makeContour.push(arc2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
    });

    it('allows offsetting the line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 1, 0));
    });

    it('allows offsetting the first arc', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 0;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.75, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 1, 0));
    })

    it('allows offsetting the second arc', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 2;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.25, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.5, 1, 0));
    })
})

describe('Line:Arc:Line', () => {
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3(-2, 0, 0);
        makeLine1.p2 = new THREE.Vector3(-1, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3(0, 0, 0);
        makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc1.p3 = new THREE.Vector3(1, 0, 0);
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 0, 0);
        makeLine2.p2 = new THREE.Vector3(2, 0, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;


        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(arc1);
        makeContour.push(line2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
    });

    it('allows offsetting the arc', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 0.5, 0));
    })

    it('allows offsetting the first line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 0;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
    })

    it('allows offsetting the second line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 2;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
    });

    describe('Filetted at a junction (Arc:Arc:Line)', () => {
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[1] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(2);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(filleted);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);
        })

        it('offsets the fillet', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -0.1;
            modifyContour.segment = 2;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(4);
            expect(model.IsClosed()).toBe(false);
    
            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
        })
    });

    describe('Filetted at both junctions (Arc:Arc:Line)', () => {
        let filleted: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeFillet = new ContourFilletFactory(db, materials, signals);
            makeFillet.contour = contour;
            makeFillet.radiuses[1] = 0.1;
            makeFillet.radiuses[0] = 0.1;
            expect(makeFillet.cornerAngles.length).toBe(2);
            filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(filleted);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));

            const model = inst2curve(db.lookup(filleted)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);
        })

        it('offsets the second fillet', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -0.1;
            modifyContour.segment = 3;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);
            expect(model.IsClosed()).toBe(false);
    
            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
        });

        it('offsets the first fillet (Line:Arc:Arc)', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -0.1;
            modifyContour.segment = 1;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);
            expect(model.IsClosed()).toBe(false);
    
            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
        });

        it('offsets the last line (which is smoothly connected before by multiple steps)', async () => {
            modifyContour.contour = filleted;
            modifyContour.distance = -0.1;
            modifyContour.segment = 4;
            const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(5);
            expect(model.IsClosed()).toBe(false);
    
            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.45, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
        })
    });
});

describe('Line:Line:Arc', () => {
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3(-3, 3, 0);
        makeLine1.p2 = new THREE.Vector3(-2, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(-2, 0, 0);
        makeLine2.p2 = new THREE.Vector3(-1, 0, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3(0, 0, 0);
        makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc1.p3 = new THREE.Vector3(1, 0, 0);
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(arc1);
        makeContour.push(line2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(-1, 1.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-3, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 3, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
    });

    it('allows offsetting the second line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(-1, 1.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-3, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 3, 0));
    })
});

describe('Arc:Line:Line', () => {
    beforeEach(async () => {
        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3(0, 0, 0);
        makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc1.p3 = new THREE.Vector3(1, 0, 0);
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3(1, 0, 0);
        makeLine1.p2 = new THREE.Vector3(2, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(2, 0, 0);
        makeLine2.p2 = new THREE.Vector3(3, 3, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(arc1);
        makeContour.push(line1);
        makeContour.push(line2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
    });

    it('allows offsetting the second line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(3);
        expect(model.IsClosed()).toBe(false);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
    })
})

describe('A half moon (Arc:Line[closed] beforeIsAfter)', () => {
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3(1, 0, 0);
        makeLine1.p2 = new THREE.Vector3(-1, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3();
        makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc1.p3 = new THREE.Vector3(1, 0, 0);
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(arc1);
        makeContour.push(line1);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
    });

    it('allows offsetting the line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = -0.5;
        modifyContour.segment = 1;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })

    it('allows offsetting the arc', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 0;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.5, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
    })

    it('ContourRebuilder the arc', () => {
        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        const before_extended = model.GetSegments()[1];
        const active_new = model.GetSegments()[0];
        const after_extended = model.GetSegments()[1];
        const result = { before_extended, active_new, after_extended, radius: 0 } as OffsetResult;
        const info = { radiusBefore: 0, radiusAfter: 0 };
        const { ordered } = ContourRebuilder.calculate(0, model.GetSegments(), true, result, info);
        expect(ordered.length).toBe(2);
        expect(ordered[0]).toBe(active_new);
        expect(ordered[1]).toBe(after_extended);
    })
});

describe('A half moon in the other direction (Line:Arc[closed])', () => {
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3(1, 0, 0);
        makeLine1.p2 = new THREE.Vector3(-1, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3();
        makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc1.p3 = new THREE.Vector3(1, 0, 0);
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(arc1);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
    });

    it('allows offsetting the line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 0;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(2);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -0.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })
})

describe('Line:Arc:Line:Arc[closed]', () => {
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3(-2, 0, 0);
        makeLine1.p2 = new THREE.Vector3(-1, 0, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc1 = new CenterPointArcFactory(db, materials, signals);
        makeArc1.center = new THREE.Vector3(0, 0, 0);
        makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc1.p3 = new THREE.Vector3(1, 0, 0);
        const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 0, 0);
        makeLine2.p2 = new THREE.Vector3(2, 0, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeArc2 = new ThreePointArcFactory(db, materials, signals);
        makeArc2.p1 = makeLine1.p1;
        makeArc2.p2 = new THREE.Vector3(0, -2, 0);
        makeArc2.p3 = makeLine2.p2;
        const arc2 = await makeArc2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(arc1);
        makeContour.push(line2);
        makeContour.push(arc2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, -0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));

        const model = inst2curve(db.lookup(contour)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(4);
        expect(model.IsClosed()).toBe(true);
    });

    it('allows offsetting the last line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 2;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(4);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, -0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
    });

    it('allows offsetting the second arc', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 0.5;
        modifyContour.segment = 3;
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
        expect(model.GetSegmentsCount()).toBe(4);
        expect(model.IsClosed()).toBe(true);

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, -0.25, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1.5, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 0));
    })
});
