import * as THREE from "three";
import circleIcon from 'bootstrap-icons/icons/circle.svg';
import circleFillIcon from 'bootstrap-icons/icons/circle-fill.svg';

const textureloader = new THREE.TextureLoader();

const circle = textureloader.load(circleIcon);
const circleFill = textureloader.load(circleFillIcon);

const isNear_material = new THREE.SpriteMaterial({ map: circle, sizeAttenuation: false });
const willSnap_material = new THREE.SpriteMaterial({ map: circleFill, sizeAttenuation: false });

const isNear = new THREE.Sprite(isNear_material);
const willSnap = new THREE.Sprite(willSnap_material);

isNear_material.onBeforeCompile = willSnap_material.onBeforeCompile = shader => {
    shader.vertexShader = `
uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
    #include <uv_vertex>
    vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
    vec2 scale;
    scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
    scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
    bool isPerspective = isPerspectiveMatrix( projectionMatrix );
    if ( isPerspective ) scale *= - mvPosition.z;
    else scale /= 1. / 6. * projectionMatrix[1][1]; // THIS IS THE KEY CHANGE
    vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
    vec2 rotatedPosition;
    rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
    rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
    mvPosition.xy += rotatedPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <fog_vertex>
}`
}

export class SpriteDatabase {
    isNear() {
        const result = isNear.clone();
        result.scale.set(0.01, 0.01, 0.01);
        return result;
    }

    willSnap() {
        const result = willSnap.clone();
        result.scale.set(0.01, 0.01, 0.01);
        return result;
    }
}
