import { DebugGeometryIdEncoder, GeometryIdEncoder } from '../../src/components/viewport/gpu_picking/GeometryGPUPickingAdapter';
import '../matchers';

beforeEach(async () => {
});

describe(GeometryIdEncoder, () => {
    const encoder = new GeometryIdEncoder();

    test('encode & decode', () => {
        let decode
        decode = encoder.decode(encoder.encode('edge', 1, 2));
        expect(decode.parentId).toBe(1);
        expect(decode.type).toBe(0);
        expect(decode.index).toBe(2);

        decode = encoder.decode(encoder.encode('face', 1024, 123));
        expect(decode.parentId).toBe(1024);
        expect(decode.type).toBe(1);
        expect(decode.index).toBe(123);

        decode = encoder.decode(encoder.encode('face', 8000, 8000));
        expect(decode.parentId).toBe(8000);
        expect(decode.type).toBe(1);
        expect(decode.index).toBe(8000);
    });
});