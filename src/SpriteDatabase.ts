import * as THREE from "three";
import circleIcon from 'bootstrap-icons/icons/circle.svg';
import circleFillIcon from 'bootstrap-icons/icons/circle-fill.svg';

const textureloader = new THREE.TextureLoader();

const circle = textureloader.load(circleIcon);
const circleFill = textureloader.load(circleFillIcon);

const isNear = new THREE.Sprite(new THREE.SpriteMaterial({ map: circle, sizeAttenuation: false }));
const willSnap = new THREE.Sprite(new THREE.SpriteMaterial({ map: circleFill, sizeAttenuation: false }));

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
