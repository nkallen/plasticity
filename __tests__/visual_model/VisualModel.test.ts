import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import theme from '../../src/startup/default-theme';
import { RenderedSceneBuilder } from "../../src/visual_model/RenderedSceneBuilder";
import { ControlPointGroup, Curve3D, CurveEdge, CurveGroup, GeometryGroupUtils, SpaceInstance } from '../../src/visual_model/VisualModel';
import { ControlPointGroupBuilder, CurveEdgeGroupBuilder, CurveSegmentGroupBuilder } from '../../src/visual_model/VisualModelBuilder';
import { BetterRaycastingPoints } from "../../src/visual_model/VisualModelRaycasting";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let makeCircle: CenterCircleFactory;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeRegion: RegionFactory;
let highlighter: RenderedSceneBuilder;
let selection: SelectionDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
    selection = new SelectionDatabase(db, materials, signals);
    highlighter = new RenderedSceneBuilder(db, materials, selection, theme, signals);
});


describe(GeometryGroupUtils, () => {
    test('compact', () => {
        let result;
        result = GeometryGroupUtils.compact([]);
        expect(result).toEqual([]);

        result = GeometryGroupUtils.compact([{ start: 0, count: 10 }]);
        expect(result).toEqual([{ start: 0, count: 10 }]);

        result = GeometryGroupUtils.compact([{ start: 0, count: 10 }, { start: 10, count: 10 }]);
        expect(result).toEqual([{ start: 0, count: 20 }]);

        result = GeometryGroupUtils.compact([{ start: 0, count: 10 }, { start: 11, count: 10 }]);
        expect(result).toEqual([{ start: 0, count: 10 }, { start: 11, count: 10 }]);

        result = GeometryGroupUtils.compact([{ start: 0, count: 10 }, { start: 10, count: 10 }, { start: 21, count: 10 }]);
        expect(result).toEqual([{ start: 0, count: 20 }, { start: 21, count: 10 }]);

        result = GeometryGroupUtils.compact([{ start: 0, count: 10 }, { start: 10, count: 10 }, { start: 30, count: 10 }, { start: 40, count: 10 }]);
        expect(result).toEqual([{ start: 0, count: 20 }, { start: 30, count: 20 }]);

        result = GeometryGroupUtils.compact([{ start: 0, count: 10 }, { start: 10, count: 10 }, { start: 30, count: 10 }, { start: 40, count: 10 }, { start: 60, count: 10 }]);
        expect(result).toEqual([{ start: 0, count: 20 }, { start: 30, count: 20 }, { start: 60, count: 10 }]);
    });
});

describe(CurveGroup, () => {
    let group: CurveGroup<CurveEdge>;
    let edgebuffer1: c3d.EdgeBuffer, edgebuffer2: c3d.EdgeBuffer, edgebuffer3: c3d.EdgeBuffer;

    describe('slice', () => {
        beforeEach(() => {
            edgebuffer1 = {
                position: new Float32Array([0, 0, 0, 1, 0, 0]),
                style: 0, simpleName: 0, name: undefined as any, i: 0
            }
            edgebuffer2 = {
                position: new Float32Array([1, 0, 0, 1, 1, 0]),
                style: 0, simpleName: 0, name: undefined as any, i: 0
            }
            edgebuffer3 = {
                position: new Float32Array([1, 1, 0, 1, 1, 1]),
                style: 0, simpleName: 0, name: undefined as any, i: 0
            }
            const builder = new CurveEdgeGroupBuilder();
            builder.add(edgebuffer1, 0, new LineMaterial(), new LineMaterial());
            builder.add(edgebuffer2, 0, new LineMaterial(), new LineMaterial());
            builder.add(edgebuffer3, 0, new LineMaterial(), new LineMaterial());
            group = builder.build();
        });

        test('it works', () => {
            const [edge1, edge2, edge3] = group.edges;
            let result, instanceStart, array, expected;

            result = group.slice([]);
            instanceStart = result.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
            array = instanceStart.data.array;
            expect(array.length).toBe(0);

            result = group.slice([edge1]);
            instanceStart = result.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
            array = instanceStart.data.array;
            expect(array).toEqual(edgebuffer1.position);

            result = group.slice([edge1, edge2]);
            instanceStart = result.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
            array = instanceStart.data.array;
            expected = new Float32Array(edgebuffer1.position.length + edgebuffer2.position.length);
            expected.set(edgebuffer1.position);
            expected.set(edgebuffer2.position, edgebuffer1.position.length)
            expect(array).toEqual(expected);

            result = group.slice([edge1, edge3]);
            instanceStart = result.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
            array = instanceStart.data.array;
            expected = new Float32Array(edgebuffer1.position.length + edgebuffer3.position.length);
            expected.set(edgebuffer1.position);
            expected.set(edgebuffer3.position, edgebuffer1.position.length)
            expect(array).toEqual(expected);
        });
    });
});

describe(ControlPointGroup, () => {
    let circle: SpaceInstance<Curve3D>;

    beforeEach(async () => {
        makeCircle.center = new THREE.Vector3(0, 0, 0);
        makeCircle.radius = 1;
        circle = await makeCircle.commit() as SpaceInstance<Curve3D>;
    })

    test('get sets position', () => {
        const point = circle.underlying.points.get(0);
        expect(point.position).toEqual(new THREE.Vector3(1, 0, 0));
    })
})

describe(Curve3D, () => {
    test('befragment zeros out points', () => {
        const buffer = {
            position: new Float32Array([0, 0, 0, 1, 0, 0]),
            style: 0, simpleName: 0, name: undefined as any, i: 0
        } as c3d.EdgeBuffer;
        const builder = new CurveSegmentGroupBuilder();
        builder.add(buffer, 0, new LineMaterial(), new LineMaterial());
        const group = builder.build();

        const points = new ControlPointGroup(10, new BetterRaycastingPoints());
        const curve = new Curve3D(group, points);
        expect(curve.points.length).toBe(10);
        curve.befragment(1, 1, new SpaceInstance());
        expect(curve.points.length).toBe(0);
        expect(curve.points.points.geometry.attributes.position.count).toBe(0);
    })
})