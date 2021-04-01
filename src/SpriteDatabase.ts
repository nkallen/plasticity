import * as THREE from "three";
import icon from 'bootstrap-icons/icons/circle.svg';

export default class SpriteDatabase {
    sprite: THREE.Sprite;

    constructor() {
        const map = new THREE.CanvasTexture(this.drawIcon(icon));
        const material = new THREE.SpriteMaterial({ map, sizeAttenuation: false });
        const sprite = new THREE.Sprite(material);
        this.sprite = sprite;
        this.sprite.scale.set(0.1, 0.1, 1);
    }

    private drawIcon(path: string) {
        console.log(icon);
        const size = 256;
        const fillStyle = 'rgba(255, 255, 255, 0.8)';
        const viewport = { x: 0, y: 0, width: 1024, height: 1024 };
        var canvas = document.createElement('canvas');
        const [width, height] = [size, size];
        const minSize = Math.min(width, height);
        canvas.width = width;
        canvas.height = height;
        const iconRatio = viewport.width / viewport.height;
        const canvasRatio = width / height;
        const scale = canvasRatio > iconRatio ? height / viewport.height : width / viewport.width;
        const context = canvas.getContext('2d');
        // draw white background
        context.save();
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fill();
        context.beginPath();
        context.fillStyle = fillStyle;
        context.arc(minSize / 2, minSize / 2, minSize / 2, 0, 2 * Math.PI);
        context.fillStyle = 'black';
        context.fill();
        context.translate(width / 2, height / 2);
        context.scale(scale, scale);
        context.translate(-viewport.x - viewport.width / 2, - viewport.y - viewport.height / 2);
        context.beginPath();
        context.fillStyle = 'red';
        context.fill(new Path2D(path));
        context.restore();
        return canvas;
    }
}