import { GridHelper } from "../../src/components/viewport/GridHelper";
import * as THREE from 'three';
import { ConstructionPlaneSnap } from "../../src/editor/snaps/ConstructionPlaneSnap";
import { CustomGrid, FloorHelper, OrthoModeGrid } from "../../src/components/viewport/FloorHelper";
import { PlaneDatabase } from "../../src/editor/PlaneDatabase";

let grids: GridHelper

beforeEach(() => {
    grids = new GridHelper(new THREE.Color(), new THREE.Color(), new THREE.Color());
})

test('getOverlay(true, ...)', () => {
    const result = grids.getOverlay(true, new ConstructionPlaneSnap(new THREE.Vector3(1, 0, 0)), new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(OrthoModeGrid);
})

test('getOverlay(false, ScreenSpace)', () => {
    const result = grids.getOverlay(false, PlaneDatabase.ScreenSpace, new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(OrthoModeGrid);
})

test('getOverlay(false, XY)', () => {
    const result = grids.getOverlay(false, PlaneDatabase.XY, new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(FloorHelper);
})

test('getOverlay(false, ....)', () => {
    const result = grids.getOverlay(false, new ConstructionPlaneSnap(new THREE.Vector3(1, 0, 0)), new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(CustomGrid);
})

test('resizeGrid', () => {
    const cplane = new ConstructionPlaneSnap();
    expect(cplane.gridFactor).toBe(1);
    grids.resizeGrid(2, cplane);
    expect(cplane.gridFactor).toBe(2);
    grids.resizeGrid(2, cplane);
    expect(cplane.gridFactor).toBe(4);
    grids.resizeGrid(0.5, cplane);
    expect(cplane.gridFactor).toBe(2);
    grids.resizeGrid(0.5, cplane);
    expect(cplane.gridFactor).toBe(1);
});

test('resizeGrid edge cases', () => {
    const cplane = new ConstructionPlaneSnap();
    grids.resizeGrid(-1, cplane);
    expect(cplane.gridFactor).toBe(0.25);
    grids.resizeGrid(100000, cplane);
    expect(cplane.gridFactor).toBe(8);
})