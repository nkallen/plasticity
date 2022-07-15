import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { GeometryFactory, NoOpError } from '../../command/GeometryFactory';
import { composeMainName, point2point } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { BooleanFactory, MultiBooleanFactory } from "../boolean/BooleanFactory";
import { PossiblyBooleanFactory } from "../boolean/PossiblyBooleanFactory";

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

        X.set(1, 0, 0).add(center);
        Z.set(0, 0, 1).multiplyScalar(radius).add(center);

        const points = [
            point2point(center),
            point2point(X),
            point2point(Z)
        ];
        const names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ElementarySolid, this.db.version), c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);
        return sphere;
    }
}

export class PossiblyBooleanSphereFactory extends PossiblyBooleanFactory<SphereFactory> implements SphereParams {
    protected bool = new MultiBooleanFactory(this.db, this.materials, this.signals);
    protected fantom = new SphereFactory(this.db, this.materials, this.signals);

    get center() { return this.fantom.center }
    get radius() { return this.fantom.radius }

    set center(center: THREE.Vector3) { this.fantom.center = center }
    set radius(radius: number) { this.fantom.radius = radius }
}