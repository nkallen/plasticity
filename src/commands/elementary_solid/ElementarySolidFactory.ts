import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class ElementarySolidFactory extends GeometryFactory {
    points = new Array<THREE.Vector3>();
    original!: visual.Solid;
    duplicate!: c3d.Solid;
    control!: c3d.ControlData3D;
    creator!: c3d.Creator;

    set solid(s: visual.Solid) {
        this.original = s;
        let model = this.db.lookup(s);
        model = model.Duplicate().Cast<c3d.Solid>(c3d.SpaceType.Solid);
        const l = model.GetCreatorsCount();
        let recent = model.SetCreator(l - 1);
        if (recent.IsA() !== c3d.CreatorType.ElementarySolid) throw new Error("invalid precondition");

        const control = recent.GetBasisPoints();
        for (let i = 0, l = control.Count(); i < l; i++) {
            const p = control.GetPoint(i);
            this.points.push(new THREE.Vector3(p.x, p.y, p.z));
        }

        this.duplicate = model;
        this.control = control;
        this.creator = recent;
    }

    async doUpdate() {
        const { creator, control, duplicate, points } = this;

        this.db.hide(this.original);

        for (const [index, point] of points.entries()) {
            control.SetPoint(index, new c3d.CartPoint3D(point.x, point.y, point.z));
        }
        control.ResetIndex();
        creator.SetBasisPoints(control);
        duplicate.RebuildItem(c3d.CopyMode.Copy, null);
        const temp = await this.db.addTemporaryItem(duplicate);
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { original, duplicate } = this;

        this.db.removeItem(original);
        const result = await this.db.addItem(duplicate);
        this.temp?.cancel();
        return result;
    }

    doCancel() {
        this.db.unhide(this.original);
        this.temp?.cancel();
    }
}