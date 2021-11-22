/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import './matchers';
import { EditorSignals } from '../src/editor/EditorSignals';
import { BasicMaterialDatabase } from "../src/editor/MaterialDatabase";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";

let materials: BasicMaterialDatabase;
let gizmos: GizmoMaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    signals = new EditorSignals();
    materials = new BasicMaterialDatabase(signals);
    gizmos = new GizmoMaterialDatabase(signals);
})

let camera: THREE.Camera;

describe('setResolution', () => {
    test('BasicMaterialDatabase', () => {
        const r1 = new THREE.Vector2(640, 480);
        signals.renderPrepared.dispatch({ camera, resolution: r1 });
        const line = materials.line();
        expect(line.resolution.width).toEqual(r1.width);
        expect(line.resolution.height).toEqual(r1.height);

        const r2 = new THREE.Vector2(1024, 768);
        signals.renderPrepared.dispatch({ camera, resolution: r2 });
        expect(line.resolution.width).toEqual(r2.width);
        expect(line.resolution.height).toEqual(r2.height);
    })

    test('GizmoMaterialDatabase', () => {
        const r1 = new THREE.Vector2(640, 480);
        signals.renderPrepared.dispatch({ camera, resolution: r1 });
        const line = gizmos.blue.line2;
        expect(line.resolution.width).toEqual(r1.width);
        expect(line.resolution.height).toEqual(r1.height);

        const r2 = new THREE.Vector2(1024, 768);
        signals.renderPrepared.dispatch({ camera, resolution: r2 });
        expect(line.resolution.width).toEqual(r2.width);
        expect(line.resolution.height).toEqual(r2.height);
    })
});