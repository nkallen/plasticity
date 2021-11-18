import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, point2point } from "../../util/Conversion";
import { BooleanFactory, PossiblyBooleanFactory } from "../boolean/BooleanFactory";
import { GeometryFactory, NoOpError } from '../GeometryFactory';

interface SphereParams {
    center: THREE.Vector3;
    radius: number;
}


export default class SphereFactory extends GeometryFactory implements SphereParams {
    center!: THREE.Vector3;
    radius!: number;

    private readonly X = new THREE.Vector3(1, 0, 0);
    private readonly Z = new THREE.Vector3(0, 0, 1);

    async calculate() {
        const { center, radius, X, Z } = this;

        if (radius < 10e-6) throw new NoOpError();

        Z.set(1,0,0).add(center);
        X.set(0,0,1).multiplyScalar(radius).add(center);

        const points = [
            point2point(center),
            point2point(Z),
            point2point(X)
        ];
        const names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ElementarySolid, this.db.version), c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);
        return sphere;
    }
}

export class PossiblyBooleanSphereFactory extends PossiblyBooleanFactory<SphereFactory> implements SphereParams {
    protected bool = new BooleanFactory(this.db, this.materials, this.signals);
    protected fantom = new SphereFactory(this.db, this.materials, this.signals);

    get solid() { return this._solid }
    set solid(solid: visual.Solid | undefined) {
        super.solid = solid;
        if (solid !== undefined) this.bool.solid = solid;
    }

    get center() { return this.fantom.center }
    get radius() { return this.fantom.radius }

    set center(center: THREE.Vector3) { this.fantom.center = center }
    set radius(radius: number) { this.fantom.radius = radius }

    protected async precomputeGeometry() {
        await super.precomputeGeometry();
        if (this._phantom !== undefined) this.bool.toolModels = [this._phantom];
    }
}

function cart2cart(center: THREE.Vector3) {
    throw new Error("Function not implemented.");
}
