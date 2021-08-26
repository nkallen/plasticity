import * as THREE from "three";
import { SymmetryFactory } from "../commands/mirror/MirrorFactory";
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import MaterialDatabase from "./MaterialDatabase";
import * as visual from "./VisualModel";
import c3d from '../../build/Release/c3d.node';

export type Replacement = { from: visual.Item, to: visual.Item }

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

class ModifierList {
    private _underlying?: visual.Item;
    private last?: visual.Item;

    constructor(
        private readonly db: GeometryDatabase,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals,
    ) { }

    async update(underlying: visual.Solid) {
        this._underlying = underlying;

        const symmetry = new SymmetryFactory(this.db, this.materials, this.signals);
        symmetry.solid = underlying as visual.Solid;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(X, Z);
        console.time("calculate");
        const symmetrized = await symmetry.calculate();
        console.timeEnd("calculate");

        console.time("add");
        const modified = await this.db.addItem(symmetrized, 'automatic');
        console.timeEnd("add");
        modified.bemodify(underlying);
        
        if (this.last !== undefined) this.db.removeItem(this.last);

        this.last = modified;
        this.signals.factoryUpdated.dispatch();
    }
}

export class ModifierManager {
    private readonly map = new Map<c3d.SimpleName, ModifierList>();

    constructor(
        private readonly db: GeometryDatabase,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals
    ) {
        signals.objectReplaced.add(r => this.objectReplaced(r));
    }

    private async objectReplaced(replacement: Replacement) {
        const map = this.map;
        const { from, to } = replacement;
        if (map.has(from.simpleName)) {
            const modifiers = this.map.get(from.simpleName)!;
            await modifiers.update(to as visual.Solid);
        }
    }

    async add(object: visual.Solid) {
        const modifiers = new ModifierList(this.db, this.materials, this.signals);
        this.map.set(object.simpleName, modifiers);
        await modifiers.update(object);
    }
}