import * as THREE from "three";
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as visual from "../../../editor/VisualModel";


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
        });
    }
}

export const vertexColorMaterial = new VertexColorMaterial();

export class PointsVertexColorMaterial extends THREE.ShaderMaterial {
    static make(points: [number, THREE.Vector3][]) {
        const positions = new Float32Array(points.length * 3);
        const colors = new Uint32Array(points.length);
        for (const [i, [id, point]] of points.entries()) {
            const position = point;
            positions[i * 3 + 0] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            colors[i] = id;
        }
        console.log(positions);
        console.log(colors);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Uint8BufferAttribute(colors.buffer, 4, true));
        const material = new PointsVertexColorMaterial(20);
        return new THREE.Points(geometry, material);
    }

    constructor(size: number) {
        super({
            vertexShader: `
            uniform float size;
            attribute vec4 color;
            varying vec4 vColor;

            #include <common>
            #include <clipping_planes_pars_vertex>
            void main() {
                vColor = color;
                #include <begin_vertex>
                #include <project_vertex>
                gl_PointSize = size;
                #include <clipping_planes_vertex>
                #include <worldpos_vertex>
            }`,
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor;
                // gl_FragColor = vec4(1,1,1,1);
            }
            `,
            clipping: true,
            uniforms: {
                size: { value: size }
            },
            blending: THREE.NoBlending,
        });
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
            groups.push({ start: offset, count: length, materialIndex: i });
            offset += length;
        }

        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(array);

        return { geometry, array, groups };
    }
}

export class LineVertexColorMaterial extends THREE.ShaderMaterial {
    static mergePositions(lines: { position: Float32Array; userData: { index: number; }; }[], id: (i: number) => number) {
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
