import * as THREE from 'three';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import { Group } from '../../src/editor/Groups';
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Scene } from '../../src/editor/Scene';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { ChangeSelectionModifier, ChangeSelectionOption } from "../../src/selection/ChangeSelectionExecutor";
import { ClickStrategy, HoverStrategy } from "../../src/selection/Click";
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import { SelectionMode, SelectionModeAll, SelectionModeSet } from '../../src/selection/SelectionModeSet';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let click: ClickStrategy;
let modes: SelectionModeSet;
let signals: EditorSignals;
let selectionDb: SelectionDatabase;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let scene: Scene;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    modes = new SelectionModeSet(SelectionModeAll, signals);
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    selectionDb = new SelectionDatabase(db, materials, signals);
    scene = new Scene(db, materials, signals);
    click = new ClickStrategy(db, scene, modes, selectionDb.selected, selectionDb.hovered, selectionDb.selected);
})

let solid1: visual.Solid;
let solid2: visual.Solid;
let circle: visual.SpaceInstance<visual.Curve3D>;
let curve: visual.SpaceInstance<visual.Curve3D>;
let region: visual.PlaneInstance<visual.Region>;
let group: Group;

beforeEach(async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid1 = await makeBox.commit() as visual.Solid;

    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    solid2 = await makeSphere.commit() as visual.Solid;

    const makeCircle = new CenterCircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeCurve = new LineFactory(db, materials, signals);
    makeCurve.p1 = new THREE.Vector3();
    makeCurve.p2 = new THREE.Vector3(1, 1, 1);
    curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeRegion = new RegionFactory(db, materials, signals);
    makeRegion.contours = [circle];
    const regions = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
    region = regions[0];

    group = scene.createGroup();
});

describe(visual.Curve3D, () => {
    beforeEach(() => {
        expect(selectionDb.selected.curves.size).toBe(0);
    })

    test('when curve mode off, has no effect', () => {
        modes.clear();
        click.curve3D(curve.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
    })

    test('when curve mode on, selects', () => {
        click.curve3D(curve.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
    });
});

describe(visual.Solid, () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when solid mode off, has no effect', () => {
        modes.clear();
        click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when solid mode on, selects', () => {
        click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
    });

    test('when the solid is already selected, selects the face and unselects the solid, returning true', () => {
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(false);
        expect(click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);
    })

    test('in solid & face mode, when the face is already selected, returns false and does not modify the selection', () => {
        modes.set(SelectionMode.Solid, SelectionMode.Face);
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);

        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(false);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);
    })

    test('in solid mode, when the face is already selected, add converts selection to solid', () => {
        modes.set(SelectionMode.Solid, SelectionMode.Face);
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);

        modes.set(SelectionMode.Solid);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);
    })

    test('when face is already selected, and mode is ONLY solid, returns true and DOES modify the selection', () => {
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);

        modes.set(SelectionMode.Solid);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);
    })

    test('when option=extend, selects the group items the solid belongs to', () => {
        scene.moveToGroup(solid1, group);
        scene.moveToGroup(circle, group);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.Extend)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.curves.size).toBe(1);
    })

    test('when option=extend, mode=solid, selects the solid group items the solid belongs to', () => {
        scene.moveToGroup(solid1, group);
        scene.moveToGroup(circle, group);
        modes.set(SelectionMode.Solid);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.Extend)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.curves.size).toBe(0);
    })

    test('when modifier=remove, option=extend, selects the group items the solid belongs to', () => {
        scene.moveToGroup(solid1, group);
        scene.moveToGroup(circle, group);

        modes.set(SelectionMode.Solid);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);

        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Remove, ChangeSelectionOption.Extend)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.curves.size).toBe(0);
    })
});

describe(visual.Face, () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when face mode off, has no effect', () => {
        modes.clear();
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(0);
    })

    test('when face mode on, selects', () => {
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(1);
    });
});

describe(visual.CurveEdge, () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when edge mode off, has no effect', () => {
        modes.clear();
        click.topologicalItem(solid1.edges.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(0);
    })

    test('when edge mode on, selects', () => {
        click.topologicalItem(solid1.edges.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(1);
    });
});

describe(visual.Region, () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when face mode off, has no effect', () => {
        modes.clear();
        click.region(region.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(0);
    })

    test('when face mode on, selects', () => {
        click.region(region.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(1);
    });
});

describe(visual.ControlPoint, () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when point mode off, has no effect', () => {
        modes.clear();
        click.controlPoint(curve.underlying.points.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    })

    test('when point mode on, selects', () => {
        click.controlPoint(curve.underlying.points.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.controlPoints.size).toBe(1);
    });
});

describe('ChangeSelectionModifier.Add', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('it selects multiple things', () => {
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(1);
        click.topologicalItem(solid1.faces.get(1), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(2);
        click.curve3D(curve.underlying, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(2);
    })

    test('it selects multiple solids', () => {
        click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        click.solid(solid2.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(2);
    })

    test('mode=Solid, the same solid twice', () => {
        modes.set(SelectionMode.Solid);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(false);
        expect(click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(false);
        expect(selectionDb.selected.solids.size).toBe(1);
    })

    test('mode=Solid+Face, the same solid twice', () => {
        modes.set(SelectionMode.Solid, SelectionMode.Face);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);
        click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);
    })


    test('mode=Solid THEN Face, the same solid twice', () => {
        modes.set(SelectionMode.Solid);
        expect(click.solid(solid1.faces.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.solids.size).toBe(1);

        modes.set(SelectionMode.Face);
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);
    })

    test('it selects multiple curves', () => {
        expect(click.curve3D(circle.underlying, ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(click.curve3D(curve.underlying, ChangeSelectionModifier.Add, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.curves.size).toBe(2);
    })

    test('it selects multiple points', () => {
        click.controlPoint(curve.underlying.points.get(0), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.controlPoints.size).toBe(1);
        click.controlPoint(curve.underlying.points.get(1), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.controlPoints.size).toBe(2);
    })
})

describe('ChangeSelectionModifier.Replace', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('it selects one face at a time', () => {
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(1);
        expect(selectionDb.selected.faces.first).toBe(solid1.faces.get(0));

        click.topologicalItem(solid1.faces.get(1), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(1);
        expect(selectionDb.selected.faces.first).toBe(solid1.faces.get(1));
    })

    test('it selects on edge at a time', () => {
        click.topologicalItem(solid1.edges.get(0), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(1);
        expect(selectionDb.selected.edges.first).toBe(solid1.edges.get(0));

        click.topologicalItem(solid1.edges.get(1), new Set(), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(1);
        expect(selectionDb.selected.edges.first).toBe(solid1.edges.get(1));
    })

    test('it selects one solid at a time', () => {
        click.solid(solid1.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        click.solid(solid2.faces.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
    })

    test('it selects one curve at a time', () => {
        expect(click.curve3D(circle.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.curves.first).toBe(circle);

        expect(click.curve3D(curve.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.curves.first).toBe(curve);
    })

    test('it selects one region at a time', () => {
        expect(click.curve3D(circle.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.curves.first).toBe(circle);

        expect(click.region(region.underlying, ChangeSelectionModifier.Replace, ChangeSelectionOption.None)).toBe(true);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.regions.size).toBe(1);
    })

    test('it selects one point at a time', () => {
        click.controlPoint(curve.underlying.points.get(0), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.controlPoints.size).toBe(1);
        expect(selectionDb.selected.controlPoints.first.simpleName).toBe(curve.underlying.points.get(0).simpleName);
        click.controlPoint(curve.underlying.points.get(1), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.controlPoints.size).toBe(1);
        expect(selectionDb.selected.controlPoints.first.simpleName).toBe(curve.underlying.points.get(1).simpleName);

    })
})

describe('ChangeSelectionModifier.Remove', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    beforeEach(() => {
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        click.topologicalItem(solid1.faces.get(1), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(2);

        click.topologicalItem(solid1.edges.get(0), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        click.topologicalItem(solid1.edges.get(1), new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(2);
    })

    it('removes topology items', () => {
        click.topologicalItem(solid1.faces.get(0), new Set(), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(1);
        expect(selectionDb.selected.faces.first).toBe(solid1.faces.get(1));
        expect(selectionDb.selected.edges.size).toBe(2);

        click.topologicalItem(solid1.faces.get(1), new Set(), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(2);

        click.topologicalItem(solid1.edges.get(0), new Set(), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(1);
        expect(selectionDb.selected.edges.first).toBe(solid1.edges.get(1));

        click.topologicalItem(solid1.edges.get(1), new Set(), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
    })
});

describe('box', () => {
    test('selecting multiple solids', () => {
        click.box(new Set([solid1, solid2]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(2);
    })

    test('selecting multiple faces of a unselected solid', () => {
        click.box(new Set([solid1.faces.get(0), solid1.faces.get(1)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(0);
    })

    test('selecting a solid then adding its face', () => {
        click.box(new Set([solid1]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);

        click.box(new Set([solid1.faces.get(0)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);
    })

    test('selecting a solid then replacing w/ its face', () => {
        click.box(new Set([solid1]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);

        click.box(new Set([solid1.faces.get(0)]), ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);
    })

    test('selecting one solid, adding another', () => {
        click.box(new Set([solid1]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        click.box(new Set([solid2]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(2);
    })

    test('selecting one solid, removing it', () => {
        click.box(new Set([solid1]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        click.box(new Set([solid1]), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('selecting a curve', () => {
        click.box(new Set([curve.underlying]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
    })

    test('selecting a curve and its control point simultaneously', () => {
        click.box(new Set([curve.underlying, curve.underlying.points.get(0)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    })

    test('selecting a curve and its control point simultaneously in the opposite order', () => {
        click.box(new Set([curve.underlying.points.get(0), curve.underlying]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    })

    test('selecting a curve and then its control point', () => {
        click.box(new Set([curve.underlying]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        click.box(new Set([curve.underlying.points.get(0)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(1);
    })

    test("selecting a group", () => {
        click.box(new Set([group]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.groups.size).toBe(1);
        click.box(new Set([group]), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.groups.size).toBe(0);
    })

    test("selecting a group with extend", () => {
        scene.moveToGroup(solid1, group);
        scene.moveToGroup(circle, group);
        click.box(new Set([group]), ChangeSelectionModifier.Add, ChangeSelectionOption.Extend);
        expect(selectionDb.selected.groups.size).toBe(0);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.curves.size).toBe(1);
    })

    test("selecting a group with extend with a specific mode", () => {
        scene.moveToGroup(solid1, group);
        scene.moveToGroup(circle, group);
        modes.set(SelectionMode.Solid);
        click.box(new Set([group]), ChangeSelectionModifier.Add, ChangeSelectionOption.Extend);
        expect(selectionDb.selected.groups.size).toBe(0);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.curves.size).toBe(0);
    })
})

describe('dblClick', () => {
    it('selects a solid regardless of mode', () => {
        modes.clear();
        expect(selectionDb.selected.solids.size).toBe(0);
        click.dblClick(solid1.faces.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.solids.size).toBe(1);
    })

    it('selects a solid and removes selected children', () => {
        const face = solid1.faces.get(0);
        expect(selectionDb.selected.faces.size).toBe(0);
        click.topologicalItem(face, new Set(), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(1);
        click.dblClick(face, ChangeSelectionModifier.Add);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);
    })
})

describe(HoverStrategy, () => {
    let hover: HoverStrategy;

    beforeEach(() => {
        hover = new HoverStrategy(db, scene, modes, selectionDb.selected, selectionDb.hovered, selectionDb.hovered);
    });

    describe('box', () => {
        test('selecting then selecting more faces ONLY hovers the faces that will be newly selected', () => {
            modes.set(SelectionMode.Face);
            click.box(new Set([solid1.faces.get(0), solid1.faces.get(1)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
            expect(selectionDb.selected.faces.size).toBe(2);
            expect(selectionDb.hovered.faces.size).toBe(0);

            hover.box(new Set([solid1.faces.get(0), solid1.faces.get(2)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
            expect(selectionDb.selected.faces.size).toBe(2);
            expect(selectionDb.hovered.faces.size).toBe(1);
            expect(selectionDb.hovered.faces.first).toBe(solid1.faces.get(2));
        })

        test('selecting then unselecting faces ONLY hovers the faces that will be unselected', () => {
            modes.set(SelectionMode.Face);
            click.box(new Set([solid1.faces.get(0), solid1.faces.get(1)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
            expect(selectionDb.selected.faces.size).toBe(2);
            expect(selectionDb.hovered.faces.size).toBe(0);

            hover.box(new Set([solid1.faces.get(0), solid1.faces.get(2)]), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
            expect(selectionDb.selected.faces.size).toBe(2);
            expect(selectionDb.hovered.faces.size).toBe(1);
            expect(selectionDb.hovered.faces.first).toBe(solid1.faces.get(0));
        })

        test('selecting then selecting more edges ONLY hovers the edges that will be newly selected', () => {
            modes.set(SelectionMode.CurveEdge);
            click.box(new Set([solid1.edges.get(0), solid1.edges.get(1)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
            expect(selectionDb.selected.edges.size).toBe(2);
            expect(selectionDb.hovered.edges.size).toBe(0);

            hover.box(new Set([solid1.edges.get(0), solid1.edges.get(2)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
            expect(selectionDb.selected.edges.size).toBe(2);
            expect(selectionDb.hovered.edges.size).toBe(1);
            expect(selectionDb.hovered.edges.first).toBe(solid1.edges.get(2));
        })

        test('selecting then unselecting edges ONLY hovers the edges that will be unselected', () => {
            modes.set(SelectionMode.CurveEdge);
            click.box(new Set([solid1.edges.get(0), solid1.edges.get(1)]), ChangeSelectionModifier.Add, ChangeSelectionOption.None);
            expect(selectionDb.selected.edges.size).toBe(2);
            expect(selectionDb.hovered.edges.size).toBe(0);

            hover.box(new Set([solid1.edges.get(0), solid1.edges.get(2)]), ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
            expect(selectionDb.selected.edges.size).toBe(2);
            expect(selectionDb.hovered.edges.size).toBe(1);
            expect(selectionDb.hovered.edges.first).toBe(solid1.edges.get(0));
        })
    })
})