import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import { CreateFaceFactory } from "../modifyface/ModifyFaceFactory";
import { MoveItemCommand } from "../translate/TranslateCommand";

export class DuplicateCommand extends Command {
    async execute(): Promise<void> {
        const { editor: { db, selection: { selected: { solids, curves, edges, faces }, selected } } } = this;

        const promises: Promise<visual.Item>[] = [];
        for (const solid of solids)
            promises.push(db.duplicate(solid));
        for (const curve of curves)
            promises.push(db.duplicate(curve));
        for (const edge of edges)
            promises.push(db.duplicate(edge));

        if (faces.size > 0) {
            const parent = faces.first.parentItem as visual.Solid;
            const createFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals);
            createFace.solid = parent;
            createFace.faces = [...faces];
            const result = createFace.commit() as Promise<visual.Solid>;
            promises.push(result);
        }

        const objects = await Promise.all(promises);

        for (const solid of solids)
            selected.removeSolid(solid);
        for (const curve of curves)
            selected.removeCurve(curve);
        for (const edge of edges)
            selected.removeEdge(edge);
        for (const face of faces)
            selected.removeFace(face);

        this.editor.selection.selected.add(objects);

        this.editor.enqueue(new MoveItemCommand(this.editor), false);
    }
}
