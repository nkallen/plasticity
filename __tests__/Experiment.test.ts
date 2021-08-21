import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { IntersectionFactory, SplitFactory } from '../src/commands/boolean/BooleanFactory';
import { ThreePointBoxFactory } from "../src/commands/box/BoxFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
import CylinderFactory from "../src/commands/cylinder/CylinderFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlaneSnap } from "../src/editor/SnapManager";
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let intersect: IntersectionFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    intersect = new IntersectionFactory(db, materials, signals);
})

describe("experiments", () => {
    test("draft with fillet", async () => {
        const makeCylinder = new CylinderFactory(db, materials, signals);
        makeCylinder.base = new THREE.Vector3();
        makeCylinder.radius = new THREE.Vector3(1, 0, 0);
        makeCylinder.height = new THREE.Vector3(0, 0, 1);
        let solid = await makeCylinder.calculate();

        const edges = solid.GetEdges();
        expect(edges.length).toBe(3);
        const edge = edges[0];
        const curve = edge.GetSpaceCurve()!;
        expect(curve.IsPeriodic()).toBe(true);

        { // fillet cylinder
            const names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);
            const params = new c3d.SmoothValues();
            params.distance1 = params.distance2 = 0.1;
            const fn = new c3d.EdgeFunction(edge, new c3d.CubicFunction(1, 1));
            solid = c3d.ActionSolid.FilletSolid(solid, c3d.CopyMode.Copy, [fn], [], params, names);
        }

        const faces = solid.GetFaces();
        expect(faces.length).toBe(4);

        let reference = faces[1]; // top plane
        const surface = reference.GetSurface().GetSurface();
        expect(surface.IsA()).toBe(c3d.SpaceType.Plane);

        let fillet: c3d.Face;
        let radius: number;
        {
            const neighbors = reference.GetNeighborFaces();
            expect(neighbors.length).toBe(1);
            fillet = neighbors[0];
            const filletSurface = fillet.GetSurface().GetSurface();
            expect(filletSurface.IsA()).toBe(c3d.SpaceType.TorusSurface);
            const torus = filletSurface.Cast<c3d.TorusSurface>(filletSurface.IsA());
            radius = torus.GetMinorRadius();
            expect(radius).toBeCloseTo(1);
        }

        let slope: c3d.Face;
        let slopeNames = new Set<c3d.SimpleName>();
        {
            const neighbors = fillet.GetNeighborFaces();
            expect(neighbors.length).toBe(2);
            slope = neighbors[0];
            const neighbor = slope.GetSurface().GetSurface();
            expect(neighbor.IsA()).toBe(c3d.SpaceType.CylinderSurface);
            slopeNames.add(slope.GetNameHash());
        }

        const similar = c3d.ActionDirect.CollectFacesForModification(solid.GetShell()!, c3d.ModifyingType.Purify, 0.1);
        expect(similar.length).toBe(1);
        const keep = [];
        for (const s of similar) {
            const names = new Set(s.GetNeighborFaces().map(f => f.GetNameHash()));
            for (const name of names) {
                if (slopeNames.has(name)) keep.push(s);
            }
        }
        expect(keep.length).toBe(1);

        {
            const params = new c3d.ModifyValues();
            params.way = c3d.ModifyingType.Purify;
            // params.direction = new c3d.Vector3D(0, 0, 0);
            const names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);
            solid = c3d.ActionDirect.FaceModifiedSolid(solid, c3d.CopyMode.Copy, params, keep, names);
        }
        expect(solid.GetFaces().length).toBe(3);

        {
            const placement = reference.GetSurfacePlacement(); // world coordinates with Z along normal
            // const control = reference.GetControlPlacement(); // Y is normal
            // const bbox = new c3d.Cube();
            // for (const face of slopes) face.AddYourGabaritTo(bbox);
            // const rect = bbox.ProjectionRect(control); // convert bbox world coordinates into normal coordinates

            // const v = control.GetVectorFrom(rect.GetLeft(), 0, 0, c3d.LocalSystemType3D.CartesianSystem);
            // placement.Move(v);

            const names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);
            const angle = 0.1;
            solid = await c3d.ActionSolid.DraftSolid_async(solid, c3d.CopyMode.Copy, placement, angle, [slope], c3d.FacePropagation.All, false, names);
        }

    });

    // test.skip('inserts faces', async () => {
    //     const log: string[] = [];
    //     const makeBox = new ThreePointBoxFactory(db, materials, signals);
    //     makeBox.p1 = new THREE.Vector3();
    //     makeBox.p2 = new THREE.Vector3(1, 0, 0);
    //     makeBox.p3 = new THREE.Vector3(1, 1, 0);
    //     makeBox.p4 = new THREE.Vector3(1, 1, 1);
    //     const box = await makeBox.commit() as visual.Solid;
    //     expect([...box.faces].length).toBe(6);

    //     const makeLine = new CurveFactory(db, materials, signals);
    //     makeLine.points.push(new THREE.Vector3(-2, -2, 0));
    //     makeLine.points.push(new THREE.Vector3(2, 2, 0));
    //     const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    //     const split = new SplitFactory(db, materials, signals);
    //     split.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
    //     split.faces = [box.faces.get(0)];
    //     split.curve = line;
    //     const result = await split.commit() as visual.Solid;

    //     const split0 = result.faces.get(0);
    //     const split1 = result.faces.get(1);

    //     const face = db.lookupTopologyItem(result.faces.get(0));
    //     const edges = face.GetOuterEdges(50);

    //     for (const edge of edges) {
    //         if (edge.IsSplit()) {
    //             console.log(edge.GetNameHash());
    //             const curve = edge.MakeCurve()!;

    //             // curve.Duplicate().Cast<c3d.Curve>(curve.IsA())
    //             const contour = new c3d.Contour();
    //             const surface = c3d.ActionSurface.ExtrusionSurface(curve, new c3d.Vector3D(0, 0, 1), false);
    //         }
    //     }
    //     console.log(log.join("\n"));
    // });
});