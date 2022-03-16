import * as THREE from "three";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { PlaneDatabase } from '../../src/editor/PlaneDatabase';
import { ConstructionPlaneSnap } from '../../src/editor/snaps/ConstructionPlaneSnap';
import '../matchers';

let planes: PlaneDatabase;
let signals: EditorSignals;

beforeEach(async () => {
    signals = new EditorSignals();
    planes = new PlaneDatabase(signals);
});

test("add", () => {
    expect([...planes.all].map(p => p.name)).toEqual(["XY", "YZ", "XZ"]);
    planes.add(new ConstructionPlaneSnap(new THREE.Vector3(1, 1, 1)));
    expect([...planes.all].map(p => p.name)).toEqual(["XY", "YZ", "XZ", "Custom plane 0"]);
})

test("temp when plane doesn't exist", () => {
    const tempAdded = jest.fn();
    signals.temporaryConstructionPlaneAdded.add(tempAdded);
    const plane = new ConstructionPlaneSnap(new THREE.Vector3(1, 1, 1));
    expect(planes.temp(plane)).toBe(plane);
    expect(tempAdded).toBeCalledTimes(1);
})
