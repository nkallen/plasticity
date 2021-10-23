/**
 * @jest-environment jsdom
 */

import { DeleteCommand, MoveCommand, RotateCommand, ScaleCommand, SymmetryCommand } from "../src/commands/GeometryCommands";
import { Model } from "../src/components/toolbar/Toolbar";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { Selection, SelectionManager } from "../src/selection/SelectionManager";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let toolbar: Model;
let selected: Selection


beforeEach(() => {
    document.createElement('div')
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    const selman = new SelectionManager(db, materials, signals);
    selected = selman.selected;
    toolbar = new Model(selected, db);
})


test('when a solid is selected you get move/rotate/scale', () => {
    const solid = new visual.Solid();

    selected.addSolid(solid);
    expect(toolbar.commands).toEqual([
        DeleteCommand, MoveCommand, RotateCommand, ScaleCommand, SymmetryCommand
    ])
})