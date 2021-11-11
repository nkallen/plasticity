import { DebugGeometryIdEncoder, GeometryIdEncoder } from '../../src/components/viewport/gpu_picking/GeometryGPUPickingAdapter';
import { DebugSnapIdEncoder, SnapIdEncoder } from '../../src/components/viewport/gpu_picking/SnapGPUPickingAdapter';
import '../matchers';

beforeEach(async () => {
});

describe(SnapIdEncoder, () => {
    const encoder = new SnapIdEncoder();

    test('encode & decode', () => {
        let type, id;
        [type, id] = encoder.decode(encoder.encode('manager', 1));
        expect(type).toEqual('manager');
        expect(id).toBe(1);

        [type, id] = encoder.decode(encoder.encode('manager', 0));
        expect(type).toEqual('manager');
        expect(id).toBe(0);

        [type, id] = encoder.decode(encoder.encode('point-picker', 0));
        expect(type).toEqual('point-picker');
        expect(id).toBe(0);


        [type, id] = encoder.decode(encoder.encode('point-picker', 10099));
        expect(type).toEqual('point-picker');
        expect(id).toBe(10099);
    });

    test('geometry and snap name collision', () => {
        const geometry = new GeometryIdEncoder();
        expect(geometry.parentIdMask & encoder.encode('point-picker', 10099)).toBe(0);

        const geometryDebug = new DebugGeometryIdEncoder();
        expect(geometryDebug.parentIdMask & encoder.encode('point-picker', 10099)).toBe(0);
    })
});

describe(DebugSnapIdEncoder, () => {
    const encoder = new DebugSnapIdEncoder();

    test('encode & decode', () => {
        let type, id;
        [type, id] = encoder.decode(encoder.encode('manager', 1));
        expect(type).toEqual('manager');
        expect(id).toBe(1);

        [type, id] = encoder.decode(encoder.encode('manager', 0));
        expect(type).toEqual('manager');
        expect(id).toBe(0);

        [type, id] = encoder.decode(encoder.encode('point-picker', 1099));
        expect(type).toEqual('point-picker');
        expect(id).toBe(1099);
    });

    test('geometry and snap name collision', () => {
        const geometryDebug = new DebugGeometryIdEncoder();
        expect(geometryDebug.parentIdMask & encoder.encode('point-picker', 0)).toBe(0);
    })
})