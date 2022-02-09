import Command from "../../command/Command";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { CancellablePromise } from "../../util/CancellablePromise";
import PlaceFactory from "./PlaceFactory";
import { PlaceGizmo } from "./PlaceGizmo";
import { PlaceKeyboardGizmo } from "./PlaceKeyboardGizmo";
import * as visual from '../../visual_model/VisualModel';

export class PlaceCommand extends Command {
    async execute(): Promise<void> {
        const { editor, editor: { db, materials, signals, selection: { selected: { solids, curves }, selected } } } = this;
        const place = new PlaceFactory(db, materials, signals).resource(this);
        place.items = [...solids];

        const keyboard = new PlaceKeyboardGizmo(editor);
        const gizmo = new PlaceGizmo(place, editor);
        let g: CancellablePromise<void> | undefined = undefined;
        const startGizmo = () => {
            if (g !== undefined) return;
            gizmo.disable();
            g = gizmo.execute(s => {
                place.update();
            }).resource(this);
        }

        const pointPicker = new PointPicker(this.editor);
        const { point: origin, info: { orientation: originOrientation } } = await pointPicker.execute(({ point, info: { orientation } }) => {
            startGizmo();
            gizmo.position.copy(point);
            gizmo.quaternion.copy(orientation);
        }).resource(this);
        place.origin = origin;
        place.originOrientation = originOrientation;

        keyboard.execute(s => {
            switch(s) {
                case 'flip':
                    place.flip = !place.flip;
                    place.update();
            }
        }).resource(this);

        await pointPicker.execute(({ point, info: { snap } }) => {
            startGizmo();
            const { orientation } = snap.project(point);
            gizmo.position.copy(point);
            gizmo.quaternion.copy(orientation);
            place.destination = point;
            place.destinationOrientation = orientation;
            place.update();
        }).resource(this);
        gizmo.enable();

        await this.finished;

        const result = await place.commit() as visual.Item[];
        selected.remove([...solids]);
        selected.add(result);
    }
}
