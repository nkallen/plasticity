import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import { PurifyFaceCommand } from "../modifyface/ModifyFaceCommand";
import { FilletFaceFactory, ModifyEdgeFactory, PurifyFaceFactory, RemoveFaceFactory } from "../modifyface/ModifyFaceFactory";
import { RemoveContourPointFactory } from "../modify_contour/ModifyContourPointFactory";


export class DeleteCommand extends Command {
    remember = false;
    
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.faces.size > 0) {
            const faces = [...selected.faces];
            const fillet = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
            if (fillet.areFilletOrChamferFaces(faces)) {
                const command = new PurifyFaceCommand(this.editor);
                await command.execute();
            } else {
                const command = new RemoveFaceCommand(this.editor);
                await command.execute();
            }
        }
        if (selected.edges.size > 0) return;
        if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new RemoveItemCommand(this.editor);
            await command.execute();
        }
        if (selected.controlPoints.size > 0) {
            const command = new RemoveControlPointCommand(this.editor);
            await command.execute();
        }
    }
}

export class RemoveItemCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selected.curves, ...this.editor.selection.selected.solids];
        const ps = items.map(i => this.editor.db.removeItem(i));
        await Promise.all(ps);
    }
}

export class RemoveControlPointCommand extends Command {
    async execute(): Promise<void> {
        const points = [...this.editor.selection.selected.controlPoints];
        const curve = points[0].parentItem;

        const removePoint = new RemoveContourPointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removePoint.controlPoints = points;
        removePoint.originalItem = curve;
        removePoint.contour = await removePoint.prepare(curve);

        const newInstances = await removePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];
        for (const inst of newInstances)
            this.editor.selection.selected.addCurve(inst);
    }
}


export class RemoveFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid;

        try {
            const removeFace = new RemoveFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
            removeFace.solid = parent;
            removeFace.faces = faces;
            await removeFace.commit();
        } catch {
            const removeFace = new PurifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
            removeFace.solid = parent;
            removeFace.faces = faces;
            await removeFace.commit();
        }
    }
}

export class RemoveEdgeCommand extends Command {
    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selected.edges];
        const parent = edges[0].parentItem as visual.Solid;

        const removeFace = new ModifyEdgeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.edges = edges;

        await removeFace.commit();
    }
}
