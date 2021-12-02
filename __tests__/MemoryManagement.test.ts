import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import { ObjectPicker } from "../src/commands/ObjectPicker";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/visual_model/VisualModel';
import { ChangeSelectionExecutor } from "../src/selection/ChangeSelectionExecutor";
import { SelectionDatabase } from "../src/selection/SelectionDatabase";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';
import c3d from '../build/Release/c3d.node';

describe("Memory management", () => {
    let box: c3d.Solid;
    beforeEach(() => {
        const points = [
            new c3d.CartPoint3D(0, 0, 0),
            new c3d.CartPoint3D(1, 0, 0),
            new c3d.CartPoint3D(1, 1, 0),
            new c3d.CartPoint3D(1, 1, 1),
        ]
        const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
        box = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, names);
        expect(box.GetUseCount()).toBe(1);
    });

    test("newly instantiated RefItems have a refcount of 1", () => {
        const model = new c3d.Model();
        expect(model.GetUseCount()).toBe(1);
    });

    test("adding and removing from models makes use count decrement", () => {
        const model = new c3d.Model();
        expect(box.GetUseCount()).toBe(1);
        const _ignore = model.AddItem(box);
        expect(model.GetUseCount()).toBe(1);
        expect(box.GetUseCount()).toBe(3);
        model.DetachItem(box);
        expect(box.GetUseCount()).toBe(2); // It's 2 because AddItem also returns a wrapped value. It will get gc'd so it should be ok.
    });

    test("faces ref counts are incremented", () => {
        const faces = box.GetFaces();
        const face = faces[0];
        expect(face.GetUseCount()).toBe(2);
        const sameFace = box.GetFace(0)!;
        expect(face.GetUseCount()).toBe(3);
        expect(sameFace.GetUseCount()).toBe(3);
    });

    test("shell ref counts are incremented", () => {
        const shell = box.GetShell()!;
        expect(shell.GetUseCount()).toBe(2);
    });

    test("casting a surface", () => {
        const faces = box.GetFaces();
        const face = faces[0];
        expect(face.GetUseCount()).toBe(2);
        const surface = face.GetSurface().GetSurface();
        expect(surface.GetUseCount()).toBe(7);
        const cast = surface.Cast<c3d.Surface>(surface.IsA());
        expect(surface.GetUseCount()).toBe(8);
        expect(cast.GetUseCount()).toBe(8);
    })
})