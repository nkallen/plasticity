import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { RegionFactory } from "../src/commands/region/RegionFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { RenderedSceneBuilder } from "../src/editor/RenderedSceneBuilder";
import { GeometryGroupUtils } from '../src/editor/VisualModel';
import { SelectionManager } from "../src/selection/SelectionManager";
import { FakeMaterials } from "../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let makeCircle: CenterCircleFactory;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeRegion: RegionFactory;
let highlighter: RenderedSceneBuilder;
let selection: SelectionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
    selection = new SelectionManager(db, materials, signals);
    highlighter = new RenderedSceneBuilder(db, materials, selection, signals);
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

    test('partition', () => {
        const groups = [{ start: 0, count: 10 }, { start: 10, count: 10 }, { start: 20, count: 10 }, { start: 30, count: 10 }, { start: 40, count: 10 }];
        let left, right;

        [left, right] = GeometryGroupUtils.partition(groups, new Set([0, 1, 2, 3, 4]), new Set());
        expect(left).toEqual(groups);
        expect(right).toEqual([]);

        [left, right] = GeometryGroupUtils.partition(groups, new Set(), new Set([0, 1, 2, 3, 4]));
        expect(left).toEqual([]);
        expect(right).toEqual(groups);

        [left, right] = GeometryGroupUtils.partition(groups, new Set([0, 1, 2]), new Set([3, 4]));
        expect(left).toEqual([{ start: 0, count: 10 }, { start: 10, count: 10 }, { start: 20, count: 10 }]);
        expect(right).toEqual([{ start: 30, count: 10 }, { start: 40, count: 10 }]);

        [left, right] = GeometryGroupUtils.partition(groups, new Set([0, 2, 4]), new Set([1, 3]));
        expect(left).toEqual([{ start: 0, count: 10 }, { start: 20, count: 10 }, { start: 40, count: 10 }]);
        expect(right).toEqual([{ start: 10, count: 10 }, { start: 30, count: 10 }]);
    });
});