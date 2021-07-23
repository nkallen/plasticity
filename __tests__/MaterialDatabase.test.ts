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

describe('setResolution', () => {
    test('BasicMaterialDatabase', () => {
        const r1 = new THREE.Vector2(640, 480);
        signals.renderPrepared.dispatch({camera: null, resolution: r1});
        const line = materials.line();
        expect(line.resolution).toEqual(r1);

        const r2 = new THREE.Vector2(1024, 768);
        signals.renderPrepared.dispatch({camera: null, resolution: r2});
        expect(line.resolution).toEqual(r2);
    })

    test('GizmoMaterialDatabase', () => {
        const r1 = new THREE.Vector2(640, 480);
        signals.renderPrepared.dispatch({camera: null, resolution: r1});
        const line = gizmos.lineBlue;
        expect(line.resolution).toEqual(r1);

        const r2 = new THREE.Vector2(1024, 768);
        signals.renderPrepared.dispatch({camera: null, resolution: r2});
        expect(line.resolution).toEqual(r2);
    })
});