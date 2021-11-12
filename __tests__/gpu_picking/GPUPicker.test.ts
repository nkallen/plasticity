import { GeometryIdEncoder } from '../../src/components/viewport/gpu_picking/GeometryGPUPickingAdapter';
import { GPUDepthReader } from '../../src/components/viewport/gpu_picking/GPUPicker';
import '../matchers';
import * as THREE from "three";

beforeEach(async () => {
});

describe(GPUDepthReader, () => {
    test('readDepth orthographic camera', () => {
        const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.001, 10_000);
        camera.up.set(0, 0, 1);
        camera.position.set(5, -5, 5);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        const array = [0, 247, 52, 0] ;
        const normalizedScreenPoint = new THREE.Vector2(0.2, 0.2);

        const position = GPUDepthReader.depth2position(array, normalizedScreenPoint, camera);
        expect(position).toApproximatelyEqual(new THREE.Vector3(0.513, 0.336, 0.823));
    });

    test('readDepth perspective camera', () => {
        const camera = new THREE.PerspectiveCamera(50);
        camera.up.set(0, 0, 1);
        camera.position.set(5, -5, 5);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        const array = [0, 247, 52, 0] ;
        const normalizedScreenPoint = new THREE.Vector2(0.2, 0.2);

        const position = GPUDepthReader.depth2position(array, normalizedScreenPoint, camera);
        expect(position).toApproximatelyEqual(new THREE.Vector3(4.945, -4.93, 4.95));
    });
});