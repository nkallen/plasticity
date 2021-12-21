/**
 * @jest-environment jsdom
 */

import { CutCommand, DeleteCommand, DuplicateCommand, MirrorCommand, MoveCommand, RadialArrayCommand, RotateCommand, ScaleCommand, ShellCommand } from "../src/commands/GeometryCommands";
import { Model } from "../src/components/toolbar/Toolbar";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/visual_model/VisualModel';
import { Selection, SelectionDatabase } from "../src/selection/SelectionDatabase";
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
    const selman = new SelectionDatabase(db, materials, signals);
    selected = selman.selected;
    toolbar = new Model(selected, db);
})


test('when a solid is selected you get move/rotate/scale', () => {
    const solid = new visual.Solid();

    selected.addSolid(solid);
    expect(toolbar.commands).toEqual([
        DeleteCommand, RotateCommand, ShellCommand, MoveCommand, ScaleCommand, MirrorCommand, RadialArrayCommand, CutCommand, DuplicateCommand
    ])
})