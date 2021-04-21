/**
 * @jest-environment jsdom
 */

import { MoveCommand, RotateCommand, ScaleCommand } from "../src/commands/Command";
import { Model } from "../src/components/toolbar/Toolbar";
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SelectionManager } from "../src/selection/SelectionManager";
import * as visual from '../src/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let toolbar: Model;
let selection: SelectionManager


beforeEach(() => {
    document.createElement('div')
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
    toolbar = new Model(selection, db);
})


test('when a solid is selected you get move/rotate/scale', () => {
    const solid = new visual.Solid();

    selection.selectedSolids.add(solid);
    expect(toolbar.commands).toEqual([
        MoveCommand, RotateCommand, ScaleCommand
    ])
})