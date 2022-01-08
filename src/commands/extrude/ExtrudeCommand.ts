import * as THREE from "three";
import Command, { EditorLike } from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import { BooleanKeyboardGizmo } from "../boolean/BooleanKeyboardGizmo";
import { ExtrudeDialog } from "./ExtrudeDialog";
import { CurveExtrudeFactory, FaceExtrudeFactory, MultiExtrudeFactory, PossiblyBooleanExtrudeFactory, RegionExtrudeFactory } from "./ExtrudeFactory";
import { ExtrudeGizmo } from "./ExtrudeGizmo";

const Y = new THREE.Vector3(0, 1, 0);

export class ExtrudeCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const { selection: { selected } } = this.editor;

        const extrude = ExtrudeFactory(this.editor).resource(this);

        const gizmo = new ExtrudeGizmo(extrude, this.editor);
        const keyboard = new BooleanKeyboardGizmo("extrude", this.editor);
        const dialog = new ExtrudeDialog(extrude, this.editor.signals);

        keyboard.prepare(extrude).resource(this);

        gizmo.position.copy(this.point ?? extrude.center);
        gizmo.quaternion.setFromUnitVectors(Y, extrude.direction);

        gizmo.execute(params => {
            extrude.update();
            keyboard.toggle(extrude.isOverlapping);
            dialog.render();
        }).resource(this);

        dialog.execute(params => {
            extrude.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await this.finished;

        const results = await extrude.commit() as visual.Solid[];
        selected.add(results);

        for (const face of selected.faces) { selected.removeFace(face) }
        for (const region of selected.regions) { selected.removeRegion(region) }
    }
}


function ExtrudeFactory(editor: EditorLike) {
    const { db, materials, signals, selection: { selected } } = editor;

    const factories = [];
    for (const region of selected.regions) {
        const factory = new RegionExtrudeFactory(db, materials, signals);
        const phantom = new RegionExtrudeFactory(db, materials, signals);
        factory.region = phantom.region = region;
        factories.push(new PossiblyBooleanExtrudeFactory(factory, phantom));
    }
    for (const face of selected.faces) {
        const factory = new FaceExtrudeFactory(db, materials, signals);
        const phantom = new FaceExtrudeFactory(db, materials, signals);
        factory.face = phantom.face = face;
        const bool = new PossiblyBooleanExtrudeFactory(factory, phantom);
        bool.target = face.parentItem;
        factories.push(bool);
    }
    if (selected.curves.size > 0) {
        const factory = new CurveExtrudeFactory(db, materials, signals);
        const phantom = new CurveExtrudeFactory(db, materials, signals);
        factory.curves = phantom.curves = [...selected.curves];
        factories.push(new PossiblyBooleanExtrudeFactory(factory, phantom));
    }
    const extrude = new MultiExtrudeFactory(factories)
    if (selected.solids.size > 0) extrude.target = selected.solids.first;
    return extrude;
}
