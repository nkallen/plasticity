/**
 * @jest-environment jsdom
 */

import { ClipCurveCommand, MoveCommand, RotateCommand, ScaleCommand, SelectFilletsCommand } from "../src/commands/GeometryCommands";
import { Model } from "../src/components/toolbar/Toolbar";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { SelectionManager } from "../src/selection/SelectionManager";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let toolbar: Model;
let selection: SelectionManager


beforeEach(() => {
    document.createElement('div')
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
    toolbar = new Model(selection, db);
})


test('when a solid is selected you get move/rotate/scale', () => {
    const solid = new visual.Solid();

    selection.selectSolid(solid);
    expect(toolbar.commands).toEqual([
        MoveCommand, RotateCommand, ScaleCommand, SelectFilletsCommand, ClipCurveCommand
    ])
})