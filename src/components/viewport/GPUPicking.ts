import * as THREE from "three";

export const pickingMaterial =  new THREE.ShaderMaterial({
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
});
