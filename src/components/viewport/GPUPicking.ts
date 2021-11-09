import * as THREE from "three";

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