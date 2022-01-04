import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from "../../editor/GeometryDatabase";
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, deunit, mat2mat, point2point, unit, vec2vec } from "../../util/Conversion";
import { GeometryFactory, NoOpError } from '../../command/GeometryFactory';

const identityMatrix = new THREE.Matrix4();
export const X = new THREE.Vector3(1, 0, 0);
export const Y = new THREE.Vector3(0, 1, 0);
export const Z = new THREE.Vector3(0, 0, 1);

abstract class TranslateFactory extends GeometryFactory {
    _items!: visual.Item[];
    private models!: c3d.Item[];

    get items() { return this._items }
    set items(items: visual.Item[]) {
        this._items = items;
        const models = [];
        for (const item of items) {
            models.push(this.db.lookup(item));
        }
        this.models = models;
    }

    private readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.TransformedSolid, this.db.version), c3d.ESides.SideNone, 0);

    protected readonly _matrix = new THREE.Matrix4();
    get matrix(): THREE.Matrix4 {
        const { transform, _matrix } = this;
        const mat = transform.GetMatrix();
        mat2mat(mat, _matrix);
        return _matrix;
    }

    // This is confusing. But view units are meters and model units are centimeters, as per usual.
    // this.matrix pivot is in model units. So any view level transforms (e.g., update) need to deunit just that part.
    private readonly tmp = new THREE.Matrix4();
    get deunitMatrix() {
        const { tmp } = this;
        const de = deunit(1);
        tmp.copy(this.matrix);
        tmp.elements[12] *= de;
        tmp.elements[13] *= de;
        tmp.elements[14] *= de;
        return tmp
    }

    async doUpdate() {
        const { db, items, deunitMatrix: mat } = this;
        let result: Promise<TemporaryObject>[] = [];
        for (const item of items) {
            const temps = db.optimization(item, async () => {
                item.matrixAutoUpdate = false;
                item.matrix.copy(mat);
                item.matrix.decompose(item.position, item.quaternion, item.scale);
                item.updateMatrixWorld(true);

                const temp = { underlying: item, show() { }, hide() { }, cancel() { } };
                return [temp] as TemporaryObject[];
            }, () => this.doOriginalUpdate(item));
            const temp = temps.then(t => t[0]);
            result.push(temp);
        }
        return await Promise.all(result);
    }

    protected doOriginalUpdate(item?: visual.Item): Promise<TemporaryObject[]> {
        return super.doUpdate(item);
    }

    async calculate(only?: visual.Item) {
        const { matrix, names } = this;
        let { models } = this;

        if (matrix.equals(identityMatrix)) throw new NoOpError();
        if (only !== undefined) models = [this.db.lookup(only)];

        const mat = mat2mat(matrix);

        const result = [];
        for (const model of models) {
            let transformed;
            if (model instanceof c3d.Solid) {
                const transform = new c3d.TransformValues(mat);
                transformed = c3d.ActionDirect.TransformedSolid(model, c3d.CopyMode.Copy, transform, names);
            } else if (model instanceof c3d.SpaceInstance) {
                transformed = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
                transformed.Transform(mat);
            } else throw new Error("invalid precondition");
            result.push(transformed);
        }
        return Promise.all(result);
    }

    protected async doCommit(): Promise<visual.Item | visual.Item[]> {
        const result = await super.doCommit();
        this.reset();
        return result;
    }

    private reset() {
        for (const item of this.items) {
            item.matrixAutoUpdate = true;
            item.position.set(0, 0, 0);
            item.quaternion.identity();
            item.scale.set(1, 1, 1);
            item.updateMatrixWorld();
        }
        for (const phantom of this._phantoms) {
            phantom.cancel();
        }
    }

    doCancel() {
        super.doCancel();
        this.reset();
    }

    protected abstract get transform(): c3d.TransformValues

    get originalItem() { return this.items }

    private _phantoms: TemporaryObject[] = [];
    async showPhantoms() {
        const phantoms = [];
        for (const model of this.models) {
            const phant = this.db.addPhantom(model, { mesh: mesh_blue, line: this.materials.lineDashed() });
            phantoms.push(phant);
        }
        const finished = await Promise.all(phantoms);
        for (const phantom of finished) {
            phantom.show();
            this._phantoms.push(phantom);
        }
    }
}

export interface MoveParams {
    move: THREE.Vector3;
    pivot: THREE.Vector3; // FIXME remove pivot for move
}

export interface MoveFactoryLike extends GeometryFactory, MoveParams {
    showPhantoms(): Promise<void>;
}

export class MoveFactory extends TranslateFactory implements MoveFactoryLike {
    move = new THREE.Vector3();
    pivot!: THREE.Vector3;

    protected get transform(): c3d.TransformValues {
        const { move } = this;

        if (move.manhattanLength() < 10e-6) throw new NoOpError();

        const params = new c3d.TransformValues();
        params.Move(vec2vec(move));
        return params;
    }
}

export interface RotateParams {
    pivot: THREE.Vector3
    axis: THREE.Vector3;
    angle: number;
    degrees: number;
}

export interface RotateFactoryLike extends GeometryFactory, RotateParams {
    showPhantoms(): Promise<void>;
}

export class RotateFactory extends TranslateFactory implements RotateFactoryLike {
    pivot!: THREE.Vector3
    axis = new THREE.Vector3(1, 0, 0);
    angle = 0;

    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }

    // I'm honestly not sure why we can't use apply matrices as in TranslateFactory above,
    // but this works instead.
    async doUpdate() {
        const { items, pivot: point, axis, angle, db } = this;
        axis.normalize();
        let result: Promise<TemporaryObject>[] = [];
        for (const item of items) {
            const temps = db.optimization(item, async () => {
                if (angle === 0) {
                    item.position.set(0, 0, 0);
                    item.quaternion.set(0, 0, 0, 1);
                    item.updateMatrixWorld();
                    const temp = { underlying: item, show() { }, hide() { }, cancel() { } };
                    return [temp] as TemporaryObject[];
                }

                item.position.set(0, 0, 0);
                item.position.sub(point);
                item.position.applyAxisAngle(axis, angle);
                item.position.add(point);
                item.quaternion.setFromAxisAngle(axis, angle);
                item.updateMatrixWorld();

                const temp = { underlying: item, show() { }, hide() {}, cancel() { } };
                return [temp] as TemporaryObject[];
            }, () => this.doOriginalUpdate(item));
            const temp = temps.then(t => t[0]);
            result.push(temp);
        }
        return Promise.all(result);
    }

    protected get transform(): c3d.TransformValues {
        const { axis, angle, pivot: point } = this;

        if (angle === 0) throw new NoOpError();

        const mat = new c3d.Matrix3D();
        const p = point2point(point);
        const v = vec2vec(axis, 1);
        const axi = new c3d.Axis3D(p, v);
        const rotation = mat.Rotate(axi, angle);

        return new c3d.TransformValues(rotation);
    }
}

export interface ScaleParams {
    scale: THREE.Vector3;
    pivot: THREE.Vector3;
}

export class BasicScaleFactory extends TranslateFactory implements ScaleParams {
    pivot = new THREE.Vector3();
    scale = new THREE.Vector3(1, 1, 1);
    protected get transform(): c3d.TransformValues {
        const { scale, pivot } = this;
        return new c3d.TransformValues(scale.x, scale.y, scale.z, point2point(pivot));
    }
}

export interface FreestyleScaleFactoryLike extends ScaleParams, GeometryFactory {
    from(p1: THREE.Vector3, p2: THREE.Vector3): void;
    to(p1: THREE.Vector3, p2: THREE.Vector3): void;
    get ref(): THREE.Vector3;
    showPhantoms(): Promise<void>;
}

export class FreestyleScaleFactory extends TranslateFactory implements FreestyleScaleFactoryLike {
    get pivot() { return this._pivot }
    set pivot(pivot: THREE.Vector3) {
        this._pivot.copy(pivot);
        const { translateFrom, translateTo } = this;
        translateFrom.makeTranslation(-unit(pivot.x), -unit(pivot.y), -unit(pivot.z));
        translateTo.makeTranslation(unit(pivot.x), unit(pivot.y), unit(pivot.z));
    }

    get matrix() { return this._matrix }
    get scale() {
        const els = this.scalemat.elements;
        return new THREE.Vector3(els[0], els[4], els[8]);
    }

    readonly ref = new THREE.Vector3();
    private readonly _pivot = new THREE.Vector3();
    private refMagnitude = 1;
    private quat = new THREE.Quaternion();
    private rotateFrom = new THREE.Matrix4();
    private rotateTo = new THREE.Matrix4();
    private translateFrom = new THREE.Matrix4();
    private translateTo = new THREE.Matrix4();
    private scalemat = new THREE.Matrix4();

    from(p1: THREE.Vector3, p2: THREE.Vector3) {
        const { ref, quat, rotateFrom, rotateTo } = this;
        this.pivot = p1;

        ref.copy(p2).sub(p1);
        this.refMagnitude = ref.length();
        ref.divideScalar(this.refMagnitude);

        quat.setFromUnitVectors(X, ref);

        rotateTo.makeRotationFromQuaternion(quat);
        rotateFrom.copy(rotateTo).transpose();
    }

    to(p1: THREE.Vector3, p3: THREE.Vector3) {
        const { _matrix, refMagnitude, rotateFrom, rotateTo, scalemat: scale, translateFrom, translateTo } = this;
        const transMagnitude = p3.distanceTo(p1);

        const scaleRatio = transMagnitude / refMagnitude;
        scale.makeScale(scaleRatio, 1, 1);

        _matrix.identity();
        _matrix.premultiply(translateFrom);
        _matrix.premultiply(rotateFrom);
        _matrix.premultiply(scale);
        _matrix.premultiply(rotateTo);
        _matrix.premultiply(translateTo);
    }

    protected get transform(): c3d.TransformValues {
        throw new Error("Method not implemented.");
    }
}

const mesh_blue = new THREE.MeshBasicMaterial();
mesh_blue.color.setHex(0xff00ff);
mesh_blue.opacity = 0.01;
mesh_blue.transparent = true;
mesh_blue.fog = false;
mesh_blue.polygonOffset = true;
mesh_blue.polygonOffsetFactor = 0.1;
mesh_blue.polygonOffsetUnits = 1;
