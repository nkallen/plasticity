import * as THREE from "three";
import { DatabaseLike } from "../../editor/GeometryDatabase";
import { Viewport } from "./Viewport";
import * as visual from "../../editor/VisualModel";
import * as intersectable from "../../editor/Intersectable";

export class GPUPicker {
    constructor(private readonly db: DatabaseLike, private readonly viewport: Viewport) {
    }

    intersect(screenPoint: THREE.Vector2): intersectable.Intersectable[] {
        const { db, viewport } = this;
        let i = (screenPoint.x | 0) + ((screenPoint.y | 0) * viewport.camera.offsetWidth);

        const buffer = new Uint32Array(viewport.pickingBuffer.buffer);
        const id = buffer[i];
        if (id === 0) return [];
        const { parentId } = visual.SolidBuilder.extract(id);
        const item = db.lookupItemById(parentId).view;
        if (item instanceof visual.Solid) {
            const simpleName = visual.SolidBuilder.compact2full(id)
            console.log(simpleName);
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
}

export const vertexColorMaterial = new THREE.ShaderMaterial({
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
        gl_FragColor = vColor / 255.;
    }
    `,
    side: THREE.FrontSide,
    blending: THREE.NoBlending,
});

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

export const vertexColorLineMaterial = new THREE.ShaderMaterial({
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
