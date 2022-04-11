/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { CenterCircleFactory } from '../src/commands/circle/CircleFactory';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import { Scene } from '../src/editor/Scene';
import { SolidCopier } from '../src/editor/SolidCopier';
import { TextureLoader } from '../src/editor/TextureLoader';
import { ChangeSelectionExecutor, ChangeSelectionModifier } from '../src/selection/ChangeSelectionExecutor';
import { SelectionDatabase } from '../src/selection/SelectionDatabase';
import { SelectionMode } from '../src/selection/SelectionModeSet';
import theme from '../src/startup/default-theme';
import { RenderedSceneBuilder } from '../src/visual_model/RenderedSceneBuilder';
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let scene: Scene;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selection: SelectionDatabase;

let solid: visual.Solid;
let highlighter: RenderedSceneBuilder;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    scene = new Scene(db, materials, signals);
    selection = new SelectionDatabase(db, materials, signals);
    highlighter = new RenderedSceneBuilder(db, scene, new TextureLoader(), selection, theme, signals);

    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;

    const makeCircle = new CenterCircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
});

test('outlineSelection', () => {
    selection.selected.addSolid(solid);
    expect([...highlighter.outlineSelection]).toEqual([solid]);
})

describe('useTemporary', () => {
    test('it uses a new selection and can be rolled back', () => {
        selection.selected.addSolid(solid);
        expect([...highlighter.outlineSelection]).toEqual([solid]);

        const temp = selection.makeTemporary();
        const dispose = highlighter.useTemporary(temp);
        expect([...highlighter.outlineSelection]).toEqual([]);

        dispose.dispose();
        expect([...highlighter.outlineSelection]).toEqual([solid]);
    })

    test('it bridges hover events', () => {
        const temp = selection.makeTemporary();
        const dispose = highlighter.useTemporary(temp);

        const hoverDelta = jest.fn();
        signals.hoverDelta.add(hoverDelta);

        temp.mode.set(SelectionMode.Solid);
        const changeSelection = new ChangeSelectionExecutor(temp, db, scene, temp.signals);
        changeSelection.onBoxHover(new Set([solid]), ChangeSelectionModifier.Replace);
        expect(hoverDelta).toHaveBeenCalledTimes(1);

        hoverDelta.mockReset();
        dispose.dispose();

        temp.signals.hoverDelta.dispatch({ added: new Set([solid]), removed: new Set() });
        expect(hoverDelta).toHaveBeenCalledTimes(0);
    })
})