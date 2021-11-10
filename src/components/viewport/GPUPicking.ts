import * as THREE from "three";
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DatabaseLike } from "../../editor/GeometryDatabase";
import * as intersectable from "../../editor/Intersectable";
import { PointSnap } from "../../editor/snaps/Snap";
import { SnapManager } from "../../editor/snaps/SnapManager";
import * as visual from "../../editor/VisualModel";
import { Viewport } from "./Viewport";

export class GPUPicker {
    private readonly pickingScene = new THREE.Scene();
    readonly pickingTarget = new THREE.WebGLRenderTarget(1, 1);
    pickingBuffer: Readonly<Uint8Array> = new Uint8Array();

    layers = new THREE.Layers();

    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 20 },
        Points: { threshold: 1 }
    };

    constructor(private readonly viewport: Viewport, private readonly db: DatabaseLike) {
        this.render = this.render.bind(this);
    }
    setSize(offsetWidth: number, offsetHeight: number) {
        this.pickingTarget.setSize(offsetWidth, offsetHeight);
        this.pickingBuffer = new Uint8Array(offsetWidth * offsetHeight * 4);
        this.render();
    }

    update(pickers: THREE.Object3D[]) {
        this.pickingScene.clear();
        for (const picker of pickers) {
            this.pickingScene.add(picker);
        }
        this.render();
    }

    render() {
        const { viewport: { renderer, camera }, pickingScene, pickingTarget, pickingBuffer } = this;

        console.time();
        renderer.setRenderTarget(pickingTarget);
        renderer.render(pickingScene, camera);
        renderer.readRenderTargetPixels(pickingTarget, 0, 0, camera.offsetWidth, camera.offsetHeight, pickingBuffer);
        console.timeEnd();
    }

    show() {
        const { viewport: { renderer, camera }, pickingScene } = this;
        renderer.setRenderTarget(null);
        renderer.render(pickingScene, camera);
    }

    private readonly screenPoint = new THREE.Vector2();
    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.screenPoint.copy(screenPoint);
    }

    intersect(): intersectable.Intersectable[] {
        const { db, viewport, screenPoint } = this;
        let i = (screenPoint.x | 0) + ((screenPoint.y | 0) * viewport.camera.offsetWidth);

        const buffer = new Uint32Array(this.pickingBuffer.buffer);
        const id = buffer[i];
        if (id === 0 || id === undefined) return [];

        const { parentId } = GPUPicker.extract(id);
        const item = db.lookupItemById(parentId).view;
        if (item instanceof visual.Solid) {
            const simpleName = GPUPicker.compact2full(id)
            const data = db.lookupTopologyItemById(simpleName);
            return [[...data.views][0]];
        } else if (item instanceof visual.SpaceInstance) {
            return [item.underlying];
        } else if (item instanceof visual.PlaneInstance) {
            return [item.underlying];
        } else {
            throw new Error("invalid item");
        }
    }

    static compactTopologyId(type: 'edge' | 'face', parentId: number, index: number): number {
        if (parentId > (1 << 16)) throw new Error("precondition failure");
        if (index > (1 << 15)) throw new Error("precondition failure");

        const a = ((parentId >> 8) & 255);
        const b = ((parentId >> 0) & 255);
        const c = (type === 'edge' ? 0 : 1) << 7;
        const d = c | ((index >> 8) & 0xef);
        const e = ((index >> 0) & 255);

        const id = (a << 24) | (b << 16) | (d << 8) | e;
        return id;
    }

    static extract(compact: number) {
        const parentId = compact >> 16;
        compact &= 0xffff;
        const type = compact >> 15;
        compact &= 0x7fff;
        const index = compact;
        return { parentId, type, index };
    }

    static compact2full(compact: number): string {
        const { parentId, type, index } = this.extract(compact);
        return type === 0 ? visual.CurveEdge.simpleName(parentId, index) : visual.Face.simpleName(parentId, index);
    }
}

export class VertexColorMaterial extends THREE.ShaderMaterial {
    static mergeBufferGeometries(geos: THREE.BufferGeometry[], id: (i: number) => number) {
        const merged = BufferGeometryUtils.mergeBufferGeometries(geos, true);
        const colors = new Uint32Array(merged.index!.count);
        let offset = 0;
        for (const geo of geos) {
            const count = geo.getAttribute('position').count;
            colors.fill(id(geo.userData.index), offset, offset + count);
            offset += count;
        }
        const attribute = new THREE.Uint8BufferAttribute(new Uint8Array(colors.buffer), 4, true);
        merged.setAttribute('color', attribute);
        return merged;
    }

    constructor() {
        super({
            vertexShader: `
            attribute vec4 color;
            varying vec4 vColor;
            void main() {
                vColor = color;
                #include <begin_vertex>
                #include <project_vertex>
                #include <clipping_planes_vertex>
            }
            `,
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor;
            }
            `,
            side: THREE.DoubleSide,
            blending: THREE.NoBlending,
        })
    }
}

export const vertexColorMaterial = new VertexColorMaterial();

export class PointsVertexColorMaterial extends THREE.ShaderMaterial {
    static make(points: [number, THREE.Vector3][]) {
        const positions = new Float32Array(points.length * 3);
        const colors = new Uint32Array(points.length);
        for (const [i, [id, point]] of points.entries()) {
            const position = point;
            positions[i + 0] = position.x;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z;

            console.log(id);
            colors[i] = id;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Uint8BufferAttribute(colors.buffer, 3, true));
        const material = new PointsVertexColorMaterial(20);
        return new THREE.Points(geometry, material);
    }

    constructor(size: number) {
        super({
            vertexShader: `
            uniform float size;
            attribute vec4 color;
            varying vec4 vColor;
            void main() {
                vColor = color;
                #include <begin_vertex>
                #include <project_vertex>
                gl_PointSize = size;
                #include <clipping_planes_vertex>
            }`,
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor;
            }
            `,
            clipping: true,
            uniforms: {
                size: { value: size }
            },
            blending: THREE.NoBlending,
        })
    }
}

export class IdMaterial extends THREE.ShaderMaterial {
    constructor(id: number) {
        super({
            vertexShader: THREE.ShaderChunk.meshbasic_vert,
            fragmentShader: `
            uniform vec4 id;
            void main() {
                gl_FragColor = id;
            }
            `,
            side: THREE.FrontSide,
            blending: THREE.NoBlending,
            uniforms: {
                id: {
                    value: [
                        (id >> 24 & 255) / 255,
                        (id >> 16 & 255) / 255,
                        (id >> 8 & 255) / 255,
                        (id & 255) / 255,
                    ]
                }
            }
        });
    }
}

export class LineSegmentGeometryAddon {
    static mergePositions(positions: Float32Array[]) {
        const groups: visual.GeometryGroup[] = [];
        let arrayLength = 0;
        for (const position of positions) {
            arrayLength += (position.length - 3) * 2;
        }
        const array = new Float32Array(arrayLength);
        let offset = 0;
        for (const [i, position] of positions.entries()) {
            // converts [ x1, y1, z1,  x2, y2, z2, ... ] to pairs format
            for (let i = 0; i < position.length; i += 3) {
                array[offset + 2 * i + 0] = position[i + 0];
                array[offset + 2 * i + 1] = position[i + 1];
                array[offset + 2 * i + 2] = position[i + 2];
                array[offset + 2 * i + 3] = position[i + 3];
                array[offset + 2 * i + 4] = position[i + 4];
                array[offset + 2 * i + 5] = position[i + 5];
            }
            const length = (position.length - 3) * 2;
            groups.push({ start: offset, count: length, materialIndex: i })
            offset += length;
        }

        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(array);

        return { geometry, array, groups };
    }
}

export class LineVertexColorMaterial extends THREE.ShaderMaterial {
    static mergePositions(lines: visual.LineInfo[], id: (i: number) => number) {
        const { geometry, array, groups } = LineSegmentGeometryAddon.mergePositions(lines.map(l => l.position));

        const colors = new Uint32Array(array.length / 3);
        let offset = 0;
        for (const { position, userData } of lines) {
            const length = (position.length - 3) * 2 / 3;
            colors.fill(id(userData.index), offset, offset + length);
            offset += length;
        }
        const instanceColorBuffer = new THREE.InstancedInterleavedBuffer(new Uint8Array(colors.buffer), 8, 1); // rgb, rgb
        geometry.setAttribute('instanceColorStart', new THREE.InterleavedBufferAttribute(instanceColorBuffer, 4, 0)); // rgb
        geometry.setAttribute('instanceColorEnd', new THREE.InterleavedBufferAttribute(instanceColorBuffer, 4, 4)); // rgb
        geometry.userData.groups = groups;
        return geometry;
    }

    constructor() {
        super({
            vertexShader: THREE.ShaderLib['line'].vertexShader
                .replace('attribute vec3 instanceColorStart;', 'attribute vec4 instanceColorStart;')
                .replace('attribute vec3 instanceColorEnd;', 'attribute vec4 instanceColorEnd;')
                .replace('vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd', 'vColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd')
                .replace(`#ifdef USE_COLOR`, `#ifdef USE_COLOR_ALPHA`),
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor / 255.;
            }
            `,
            blending: THREE.NoBlending,
            uniforms: {
                ...THREE.UniformsUtils.clone(THREE.ShaderLib['line'].uniforms),
                diffuse: { value: [1, 1, 1] }, opacity: { value: 1 }, linewidth: { value: 10 }
            },
            defines: { 'USE_COLOR_ALPHA': '' },
            clipping: true,
        });
    }
}

export const vertexColorLineMaterial = new LineVertexColorMaterial();

export class GPUSnapAdapter {
    constructor(private readonly snaps: SnapManager) { }

    update(picker: GPUPicker) {
        picker.update(this.refresh());
    }

    refresh() {
        const points: [number, THREE.Vector3][] = [];
        for (const [i, snap] of this.snaps.all.entries()) {
            if (snap instanceof PointSnap) points.push([i, snap.position]);
        }

        return [PointsVertexColorMaterial.make(points)];
    }
}