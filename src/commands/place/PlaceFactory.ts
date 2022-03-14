import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from "../../command/GeometryFactory";
import { TemporaryObject } from "../../editor/DatabaseLike";
import { composeMainName, mat2mat, unit } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';

export interface PlaceParams {
    origin: THREE.Vector3;
    originOrientation: THREE.Quaternion;
    flip: boolean;
    angle: number;
    degrees: number;
    scale: number;
    offset: number;

    destination: THREE.Vector3;
    destinationOrientation: THREE.Quaternion;
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

export default class PlaceFactory extends GeometryFactory implements PlaceParams {
    origin!: THREE.Vector3;
    originOrientation!: THREE.Quaternion;
    angle = 0;
    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }
    scale = 1;
    offset = 0;

    destination!: THREE.Vector3;
    destinationOrientation!: THREE.Quaternion;
    flip = false;

    _items!: visual.Item[];
    dups!: visual.Item[];
    private models!: c3d.Item[];
    get items() { return this._items }
    set items(items: visual.Item[]) {
        this._items = items;
        const dups = [];
        for (const item of items) {
            const dup = item.clone();
            this.db.temporaryObjects.add(dup);
            dups.push(dup);
        }
        this.dups = dups;
        const models = [];
        for (const item of items) {
            models.push(this.db.lookup(item));
        }
        this.models = models;
    }

    private readonly delta = new THREE.Vector3();
    private readonly voffset = new THREE.Vector3();
    private readonly qelta = new THREE.Quaternion();
    private readonly floop = new THREE.Quaternion();

    private readonly toOrigin = new THREE.Matrix4();
    private readonly rotate = new THREE.Matrix4();
    private readonly scaleMat = new THREE.Matrix4();
    private readonly toDestination = new THREE.Matrix4();
    private readonly _offset = new THREE.Matrix4();
    private readonly _mat = new THREE.Matrix4();

    mat(factor = unit(1)) {
        const { origin, originOrientation, destination, destinationOrientation, flip, scale, angle, offset } = this;
        const { delta, qelta, toOrigin, rotate, toDestination, _offset, _mat, scaleMat, floop, voffset } = this;

        delta.subVectors(destination, origin);
        qelta.copy(originOrientation).invert()
        if (angle != 0) qelta.premultiply(floop.setFromAxisAngle(Z, angle));
        if (flip) qelta.premultiply(floop.setFromAxisAngle(X, Math.PI))
        qelta.premultiply(destinationOrientation);
        voffset.set(0, 0, offset).applyQuaternion(destinationOrientation);

        scaleMat.makeScale(scale, scale, scale);
        toOrigin.makeTranslation(factor * -origin.x, factor * -origin.y, factor * -origin.z);
        toDestination.makeTranslation(factor * destination.x, factor * destination.y, factor * destination.z);
        rotate.makeRotationFromQuaternion(qelta);
        _offset.makeTranslation(voffset.x, voffset.y, voffset.z);
        _mat.copy(toOrigin).premultiply(rotate).premultiply(scaleMat).premultiply(toDestination).premultiply(_offset);
        return _mat;
    }

    async doUpdate(abortEarly: () => boolean) {
        const { db, dups } = this;
        const mat = this.mat(1);

        let result: Promise<TemporaryObject>[] = [];
        for (const item of dups) {
            const temps = db.optimization(item, async () => {
                mat.decompose(item.position, item.quaternion, item.scale);
                item.updateMatrixWorld(true);

                const temp = {
                    underlying: item,
                    show() { },
                    hide() { },
                    cancel() { }
                };
                return [temp] as TemporaryObject[];
            }, () => super.doUpdate(abortEarly, item));
            const temp = temps.then(t => t[0]);
            result.push(temp);
        }
        return await Promise.all(result);
    }

    calculate(): Promise<c3d.Item[]> {
        const { models } = this;
        const mat = mat2mat(this.mat());
        const result = [];
        for (const model of models) {
            const transformed = model.Duplicate().Cast<c3d.SpaceInstance>(model.IsA());
            transformed.Transform(mat);
            result.push(transformed);
        }
        return Promise.all(result);
    }
}