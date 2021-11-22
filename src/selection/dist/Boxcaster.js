"use strict";
exports.__esModule = true;
exports.Boxcaster = void 0;
var THREE = require("three");
var Boxcaster = /** @class */ (function () {
    function Boxcaster(camera, deep) {
        if (deep === void 0) { deep = Number.MAX_VALUE; }
        this.camera = camera;
        this.deep = deep;
        this.layers = new THREE.Layers();
        this.startPoint = new THREE.Vector3();
        this.endPoint = new THREE.Vector3();
        this.collection = [];
        this.frustum = new THREE.Frustum();
        this.mode = 'contains';
    }
    Boxcaster.prototype.selectObject = function (object, selected) {
        if (selected === void 0) { selected = []; }
        if (!this.layers.test(object.layers))
            return selected;
        var bounds = object.intersectsBounds(this);
        if (bounds == 'not-intersected')
            selected;
        object.boxcast(bounds, this, selected);
        return selected;
    };
    Boxcaster.prototype.selectObjects = function (objects, optionalTarget) {
        if (optionalTarget === void 0) { optionalTarget = []; }
        for (var _i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
            var object = objects_1[_i];
            this.selectObject(object, optionalTarget);
        }
        return optionalTarget;
    };
    Boxcaster.prototype.selectGeometry = function (object, selected) {
        if (object.containsGeometry(boxcaster)) {
            selects.push(this);
        }
    };
    Boxcaster.prototype.updateFrustum = function () {
        var _a = this, startPoint = _a.startPoint, endPoint = _a.endPoint;
        var sign = Math.sign(_cross.crossVectors(startPoint, endPoint).z);
        this.mode = sign > 0 ? 'contains' : 'includes';
        // Avoid invalid frustum
        if (startPoint.x === endPoint.x)
            endPoint.x += Number.EPSILON;
        if (startPoint.y === endPoint.y)
            endPoint.y += Number.EPSILON;
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
        var planes = this.frustum.planes;
        if (this.camera.isPerspectiveCamera) {
            _tmpPoint.copy(startPoint);
            _tmpPoint.x = Math.min(startPoint.x, endPoint.x);
            _tmpPoint.y = Math.max(startPoint.y, endPoint.y);
            endPoint.x = Math.max(startPoint.x, endPoint.x);
            endPoint.y = Math.min(startPoint.y, endPoint.y);
            _vecNear.setFromMatrixPosition(this.camera.matrixWorld);
            _vecTopLeft.copy(_tmpPoint);
            _vecTopRight.set(endPoint.x, _tmpPoint.y, 0);
            _vecDownRight.copy(endPoint);
            _vecDownLeft.set(_tmpPoint.x, endPoint.y, 0);
            _vecTopLeft.unproject(this.camera);
            _vecTopRight.unproject(this.camera);
            _vecDownRight.unproject(this.camera);
            _vecDownLeft.unproject(this.camera);
            _vectemp1.copy(_vecTopLeft).sub(_vecNear);
            _vectemp2.copy(_vecTopRight).sub(_vecNear);
            _vectemp3.copy(_vecDownRight).sub(_vecNear);
            _vectemp1.normalize();
            _vectemp2.normalize();
            _vectemp3.normalize();
            _vectemp1.multiplyScalar(this.deep);
            _vectemp2.multiplyScalar(this.deep);
            _vectemp3.multiplyScalar(this.deep);
            _vectemp1.add(_vecNear);
            _vectemp2.add(_vecNear);
            _vectemp3.add(_vecNear);
            planes[0].setFromCoplanarPoints(_vecNear, _vecTopLeft, _vecTopRight);
            planes[1].setFromCoplanarPoints(_vecNear, _vecTopRight, _vecDownRight);
            planes[2].setFromCoplanarPoints(_vecDownRight, _vecDownLeft, _vecNear);
            planes[3].setFromCoplanarPoints(_vecDownLeft, _vecTopLeft, _vecNear);
            planes[4].setFromCoplanarPoints(_vecTopRight, _vecDownRight, _vecDownLeft);
            planes[5].setFromCoplanarPoints(_vectemp3, _vectemp2, _vectemp1);
            planes[5].normal.multiplyScalar(-1);
        }
        else if (this.camera.isOrthographicCamera) {
            var left = Math.min(startPoint.x, endPoint.x);
            var top = Math.max(startPoint.y, endPoint.y);
            var right = Math.max(startPoint.x, endPoint.x);
            var down = Math.min(startPoint.y, endPoint.y);
            _vecTopLeft.set(left, top, -1);
            _vecTopRight.set(right, top, -1);
            _vecDownRight.set(right, down, -1);
            _vecDownLeft.set(left, down, -1);
            _vecFarTopLeft.set(left, top, 1);
            _vecFarTopRight.set(right, top, 1);
            _vecFarDownRight.set(right, down, 1);
            _vecFarDownLeft.set(left, down, 1);
            _vecTopLeft.unproject(this.camera);
            _vecTopRight.unproject(this.camera);
            _vecDownRight.unproject(this.camera);
            _vecDownLeft.unproject(this.camera);
            _vecFarTopLeft.unproject(this.camera);
            _vecFarTopRight.unproject(this.camera);
            _vecFarDownRight.unproject(this.camera);
            _vecFarDownLeft.unproject(this.camera);
            planes[0].setFromCoplanarPoints(_vecTopLeft, _vecFarTopLeft, _vecFarTopRight);
            planes[1].setFromCoplanarPoints(_vecTopRight, _vecFarTopRight, _vecFarDownRight);
            planes[2].setFromCoplanarPoints(_vecFarDownRight, _vecFarDownLeft, _vecDownLeft);
            planes[3].setFromCoplanarPoints(_vecFarDownLeft, _vecFarTopLeft, _vecTopLeft);
            planes[4].setFromCoplanarPoints(_vecTopRight, _vecDownRight, _vecDownLeft);
            planes[5].setFromCoplanarPoints(_vecFarDownRight, _vecFarTopRight, _vecFarTopLeft);
            planes[5].normal.multiplyScalar(-1);
        }
    };
    Boxcaster.prototype.searchChildInFrustum = function (frustum, object) {
        // if (object.geometry.boundingSphere === null) object.geometry.computeBoundingSphere();
        // _center.copy(object.geometry.boundingSphere.center);
        // _center.applyMatrix4(object.matrixWorld);
        // if (frustum.containsPoint(_center)) {
        //     this.collection.push(object);
        // }
    };
    return Boxcaster;
}());
exports.Boxcaster = Boxcaster;
var _center = new THREE.Vector3();
var _tmpPoint = new THREE.Vector3();
var _vecNear = new THREE.Vector3();
var _vecTopLeft = new THREE.Vector3();
var _vecTopRight = new THREE.Vector3();
var _vecDownRight = new THREE.Vector3();
var _vecDownLeft = new THREE.Vector3();
var _vecFarTopLeft = new THREE.Vector3();
var _vecFarTopRight = new THREE.Vector3();
var _vecFarDownRight = new THREE.Vector3();
var _vecFarDownLeft = new THREE.Vector3();
var _vectemp1 = new THREE.Vector3();
var _vectemp2 = new THREE.Vector3();
var _vectemp3 = new THREE.Vector3();
var _cross = new THREE.Vector3();
