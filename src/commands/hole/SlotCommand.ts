import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { FaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { AxisSnap, FaceSnap, PlaneSnap } from "../../editor/snaps/Snap";
import { SlotDialog as SlotDialog } from "./SlotDialog";
import { SlotFactory } from "./SlotFactory";

export class SlotCommand extends Command {
    async execute(): Promise<void> {
        const slot = new SlotFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        let dialog = new SlotDialog(slot, this.editor.signals);

        dialog.execute(params => {
            slot.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        let pointPicker = new PointPicker(this.editor);
        pointPicker.raycasterParams.Line2.threshold = 1;

        const { point: p1, info: { snap, orientation } } = await pointPicker.execute().resource(this);
        let faceSnap: FaceSnap;
        if (snap instanceof FaceSnap) faceSnap = snap;
        else if (snap instanceof FaceConstructionPlaneSnap) faceSnap = snap.faceSnap;
        else throw new Error("invalid snap");

        slot.p1 = p1;
        slot.face = faceSnap.view;
        slot.solid = faceSnap.view.parentItem;
        slot.orientation = orientation;

        pointPicker = new PointPicker(this.editor);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.addAxesAt(p1);
        pointPicker.restrictToPlane(PlaneSnap.from(p1, orientation))
        await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            slot.p2 = p2;
            slot.update();
        }).resource(this);

        await this.finished;

        await slot.commit();
    }
}