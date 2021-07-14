import * as THREE from "three";
import _ from "underscore-plus";
import c3d from '../../build/Release/c3d.node';
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from "../GeometryDatabase";
import MaterialDatabase from "../MaterialDatabase";
import { PointPicker } from '../PointPicker';
import { SelectionInteractionManager } from "../selection/SelectionInteraction";
import { HasSelection, ModifiesSelection } from "../selection/SelectionManager";
import { SnapManager } from "../SnapManager";
import { CancellableRegistor, Finish } from "../util/Cancellable";
import { Helpers } from "../util/Helpers";
import * as visual from "../VisualModel";
import { mode } from "./AbstractGizmo";
import { CutFactory, DifferenceFactory, IntersectionFactory, UnionFactory } from './boolean/BooleanFactory';
import BoxFactory from './box/BoxFactory';
import CircleFactory from './circle/CircleFactory';
import CurveAndContourFactory from "./curve/CurveAndContourFactory";
import { CurveGizmo, CurveGizmoEvent } from "./curve/CurveGizmo";
import JoinCurvesFactory from "./curve/JoinCurvesFactory";
import CylinderFactory from './cylinder/CylinderFactory';
import ElementarySolidFactory from "./elementary_solid/ElementarySolidFactory";
import { ElementarySolidGizmo } from "./elementary_solid/ElementarySolidGizmo";
import ExtrudeFactory, { RegionExtrudeFactory } from "./extrude/ExtrudeFactory";
import { FilletDialog } from "./fillet/FilletDialog";
import FilletFactory, { Max } from './fillet/FilletFactory';
import { FilletGizmo } from './fillet/FilletGizmo';
import { VariableFilletGizmo } from "./fillet/VariableFilletGizmo";
import { GizmoMaterialDatabase } from "./GizmoMaterials";
import LineFactory from './line/LineFactory';
import LoftFactory from "./loft/LoftFactory";
import MirrorFactory from "./mirror/MirrorFactory";
import { DraftSolidFactory } from "./modifyface/DraftSolidFactory";
import { ActionFaceFactory, CreateFaceFactory, FilletFaceFactory, OffsetFaceFactory, PurifyFaceFactory, RemoveFaceFactory } from "./modifyface/ModifyFaceFactory";
import { OffsetFaceGizmo } from "./modifyface/OffsetFaceGizmo";
import MoveFactory from './move/MoveFactory';
import { MoveGizmo } from './move/MoveGizmo';
import RectFactory from './rect/RectFactory';
import { RegionBooleanFactory } from "./region/RegionBooleanFactory";
import RegionFactory from "./region/RegionFactory";
import RotateFactory from './rotate/RotateFactory';
import { RotateGizmo } from './rotate/RotateGizmo';
import ScaleFactory from "./scale/ScaleFactory";
import SphereFactory from './sphere/SphereFactory';

/**
 * Commands have two responsibilities. They are usually a step-by-step interactive workflow for geometrical
 * operations, like creating a cylinder. But they also encapsulate any state change that needs to be atomic,
 * for the purposes of UNDO. Thus, selection changes are also commands.
 * 
 * For the most part, a Command is a user-friendly wrapper around a Factory. The factory actually creates 
 * geometrical objects and adds them to the database. Whereas the Command shows the users a dialog box,
 * interactive gizmos, etc. While the user interacts with the gizmo or dialog fields, the factory is
 * "updated". When the user is finished the factory is "committed".
 * 
 * Commands can be written such that they complete immediately after the user's first interaction
 * (as in the Move command), or they can stick around allowing the user to refine values and finish
 * only when the user clicks "ok" (as in the Fillet command).
 * 
 * A key implementation detail of Commands is that they have "resources". Resources include gizmos, dialogs,
 * and factories. A resource represents something that can be "finished" or "cancelled." Modeling all of
 * these objects as resources makes it easy to clean-up a command when finishing or cancelling. Because
 * most resources deal with Promises, it's important to make sure all exceptions are handled, and calling
 * await Promise.all(this.resources) will ensure nothing is uncaught.
 */

export interface EditorLike {
    db: GeometryDatabase,
    signals: EditorSignals,
    materials: MaterialDatabase,
    viewports: Viewport[],
    snaps: SnapManager,
    helpers: Helpers,
    registry: CommandRegistry,
    selection: HasSelection & ModifiesSelection,
    gizmos: GizmoMaterialDatabase,
    selectionInteraction: SelectionInteractionManager
}

export default abstract class Command extends CancellableRegistor {
    static get title() { return this.name.replace(/Command/, '') }
    static get identifier() { return _.dasherize(this.title) }
    get title() { return this.constructor.name.replace(/Command/, '') }
    get identifier() { return _.dasherize(this.title) }

    constructor(protected readonly editor: EditorLike) {
        super();
    }

    abstract execute(): Promise<void>;
}

export class SphereCommand extends Command {
    async execute(): Promise<void> {
        const sphere = new SphereFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const pointPicker = new PointPicker(this.editor);

        const { point: p1 } = await pointPicker.execute().resource(this);
        sphere.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
        }).resource(this);
        await sphere.commit();
    }
}

export class CircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        circle.center = p1;
        await pointPicker.execute(p2 => {
            const radius = p1.distanceTo(p2);
            circle.radius = radius;
            circle.update();
        }).resource(this);
        await circle.commit() as visual.SpaceInstance<visual.Curve3D>;

        this.editor.signals.contoursChanged.dispatch();
    }
}

export class RegionCommand extends Command {
    async execute(): Promise<void> {
        const region = new RegionFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        region.contours = [...this.editor.selection.selectedCurves];
        await region.commit();
    }
}

export class RegionBooleanCommand extends Command {
    async execute(): Promise<void> {
        const region = new RegionBooleanFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        region.regions = [...this.editor.selection.selectedRegions];
        await region.commit();
    }
}

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        let pointPicker = new PointPicker(this.editor);

        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.disableVerticalStraightSnap();

        const { point: p2 } = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        }).resource(this);
        circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cylinder.base = p1;
        cylinder.radius = p2;
        pointPicker = new PointPicker(this.editor);
        pointPicker.addPlacement(p1);
        await pointPicker.execute((p3: THREE.Vector3) => {
            cylinder.height = p3;
            cylinder.update();
        }).resource(this);

        await cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute(): Promise<void> {
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.commit();
    }
}

export class CurveCommand extends Command {
    async execute(): Promise<void> {
        const makeCurve = new CurveAndContourFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const keyboard = new CurveGizmo(this.editor);
        keyboard.execute((e: CurveGizmoEvent) => {
            switch (e.tag) {
                case 'type':
                    makeCurve.type = e.type;
                    makeCurve.update();
                    break;
                case 'add-curve':
                    makeCurve.push();
                    break;
                case 'undo':
                    pointPicker.undo(); // FIXME in theory the overlay needs to be updated;
                    makeCurve.undo();
                    makeCurve.update();
                    break;
            }
        }).resource(this);

        while (true) {
            try {
                const { point } = await pointPicker.execute(async (p: THREE.Vector3) => {
                    makeCurve.nextPoint = p;
                    if (!makeCurve.isValid) return;
                    makeCurve.closed = makeCurve.wouldBeClosed(p);
                    await makeCurve.update();
                }).resource(this);
                if (makeCurve.wouldBeClosed(point)) {
                    makeCurve.closed = true;
                    throw Finish;
                }
                makeCurve.nextPoint = undefined;
                makeCurve.points.push(point);
                await makeCurve.update();
            } catch (e) {
                if (e !== Finish) throw e;
                break;
            }
        }

        await makeCurve.commit();
        this.editor.signals.contoursChanged.dispatch();
    }
}

export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        for (const curve of this.editor.selection.selectedCurves) contour.curves.push(curve);
        await contour.commit();
    }
}

export class RectCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute();
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const makeRect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        makeRect.p1 = p1;
        makeRect.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            makeRect.p3 = p3;
            makeRect.update();
        }).resource(this);

        await makeRect.commit();

        this.editor.signals.contoursChanged.dispatch();
    }
}

export class BoxCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const { point: p3 } = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        await rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute((p4: THREE.Vector3) => {
            box.p4 = p4;
            box.update();
        }).resource(this);
        await box.commit();
    }
}

export class MoveCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selectedSolids, ...this.editor.selection.selectedCurves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);

        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = centroid;

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        move.p1 = centroid;
        move.items = objects;

        const moveGizmo = new MoveGizmo(this.editor, centroid);
        await moveGizmo.execute(delta => {
            line.p2 = line.p1.clone().add(delta);
            move.p2 = move.p1.clone().add(delta);
            Promise.all([
                line.update(), move.update()]);
        }).resource(this);
        Promise.all([
            line.cancel(),
            move.commit()]);
    }
}

export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const objects = [...this.editor.selection.selectedSolids];

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: origin } = await pointPicker.execute().resource(this);
        line.p1 = origin;

        const { point: p2 } = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const line2 = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = origin;

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        scale.items = objects;
        scale.origin = line2.p1 = origin;
        scale.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            line2.p2 = p3;
            scale.p3 = p3
            line2.update();
            scale.update();
        }).resource(this);
        await line2.cancel();

        await scale.commit();
    }
}

export class RotateCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selectedSolids];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);

        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rotate.items = objects;
        rotate.point = centroid;

        const rotateGizmo = new RotateGizmo(this.editor, centroid);
        await rotateGizmo.execute((axis, angle) => {
            rotate.axis = axis;
            rotate.angle = angle;
            rotate.update();
        }).resource(this);

        await rotate.commit();
    }
}

export class UnionCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedSolids];
        const object1 = items[0]!;
        const object2 = items[1]!;

        const union = new UnionFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        union.item1 = object1;
        union.item2 = object2;
        await union.commit();
    }
}

export class IntersectionCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedSolids];
        const object1 = items[0]!;
        const object2 = items[1]!;

        const intersection = new IntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        intersection.item1 = object1;
        intersection.item2 = object2;
        await intersection.commit();
    }
}

export class DifferenceCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedSolids];
        const object1 = items[0]!;
        const object2 = items[1]!;

        const difference = new DifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        difference.item1 = object1;
        difference.item2 = object2;
        await difference.commit();
    }
}

export class CutCommand extends Command {
    async execute(): Promise<void> {
        const solids = [...this.editor.selection.selectedSolids];
        const curves = [...this.editor.selection.selectedCurves];
        const object1 = solids[0]!;
        const object2 = curves[0]!;

        const cut = new CutFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cut.solid = object1;
        cut.contour = object2;
        await cut.commit();
    }
}

export class FilletCommand extends Command {
    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selectedEdges];
        const edge = edges[edges.length - 1];
        const item = edge.parentItem as visual.Solid;

        edge.geometry.computeBoundingBox();
        const centroid = new THREE.Vector3();
        edge.geometry.boundingBox!.getCenter(centroid);

        const fillet = new FilletFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        fillet.item = item;
        fillet.edges = edges;

        const curveEdge = this.editor.db.lookupTopologyItem(edge) as c3d.CurveEdge;
        const normal = curveEdge.EdgeNormal(0.5);
        const filletGizmo = new FilletGizmo(this.editor, centroid, new THREE.Vector3(normal.x, normal.y, normal.z));

        const filletDialog = new FilletDialog(fillet, this.editor.signals);
        const dialog = filletDialog.execute(async params => {
            filletGizmo.render(params.distance1);
            await fillet.update();
        }).resource(this);

        const max = new Max(fillet);
        max.start();

        const keyboard = new VariableFilletGizmo(this.editor);
        const pp = new PointPicker(this.editor);
        const restriction = pp.restrictToEdges(edges);
        keyboard.execute(async e => {
            switch (e.tag) {
                case 'add':
                    const { point } = await pp.execute().resource(this);
                    const { visual, model, t } = restriction.match;
                    const normal = model.EdgeNormal(t);
                    const gizmo = new FilletGizmo(this.editor, point, new THREE.Vector3(normal.x, normal.y, normal.z));
                    const fn = fillet.functions.get(visual.simpleName)!;
                    gizmo.execute(async delta => {
                        fn.InsertValue(t, delta);
                        await fillet.update();
                    }, mode.Persistent).resource(this);
                    break;
                case 'undo':
                    break;
            }
        }).resource(this);

        filletGizmo.execute(async delta => {
            filletDialog.render();
            await max.exec(delta);
        }, mode.Persistent).resource(this);

        // Dialog OK/Cancel buttons trigger completion of the entire command.
        dialog.then(() => this.finish(), () => this.cancel());

        // Clean-up all resources and throw if anything was cancelled.
        await Promise.all(this.promises);

        const selection = await fillet.commit() as visual.Solid;
        this.editor.selection.selectSolid(selection);
    }
}

export class OffsetFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const offsetFace = new OffsetFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        offsetFace.solid = parent;
        offsetFace.faces = faces;

        // FIXME move this and things like it into the factory
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new OffsetFaceGizmo(this.editor, point, normal);

        await gizmo.execute(async delta => {
            offsetFace.direction = new THREE.Vector3(delta, 0, 0);
            await offsetFace.update();
        }).resource(this);

        await offsetFace.commit();
    }
}


export class DraftSolidCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const face = faces[0];
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new RotateGizmo(this.editor, point);

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        draftSolid.solid = parent;
        draftSolid.faces = faces;
        draftSolid.origin = point;

        await gizmo.execute((axis, angle) => {
            draftSolid.axis = axis;
            draftSolid.angle = angle;
            draftSolid.update();
        }).resource(this);

        await draftSolid.commit();
    }
}


export class RemoveFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new RemoveFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class PurifyFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new PurifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class CreateFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class ActionFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const actionFace = new ActionFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        actionFace.solid = parent;
        actionFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new MoveGizmo(this.editor, point);

        await gizmo.execute(async delta => {
            actionFace.direction = delta;
            await actionFace.update();
        }).resource(this);

        await actionFace.commit();
    }
}

export class FilletFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const refilletFace = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        refilletFace.solid = parent;
        refilletFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new OffsetFaceGizmo(this.editor, point, normal);

        await gizmo.execute(async delta => {
            refilletFace.direction = new THREE.Vector3(delta, 0, 0);
            await refilletFace.update();
        }).resource(this);

        await refilletFace.commit();
    }
}

export class SuppleFaceCommand extends Command { async execute(): Promise<void> { } }

export class MergerFaceCommand extends Command { async execute(): Promise<void> { } }

export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        loft.contours = curves;
        await loft.commit();
    }
}

export class ExtrudeCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const extrude = new ExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        extrude.curves = curves;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);

        await pointPicker.execute(p2 => {
            extrude.direction = p2.clone().sub(p1);
            extrude.distance1 = extrude.direction.length();
            extrude.update();
        }).resource(this);

        await extrude.commit();
    }
}

export class ExtrudeRegionCommand extends Command {
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const regions = [...this.editor.selection.selectedRegions];
        const extrude = new RegionExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        extrude.region = regions[0];
        const gizmo = new OffsetFaceGizmo(this.editor, this.point ?? new THREE.Vector3(), extrude.direction);
        await gizmo.execute(delta => {
            extrude.distance1 = delta;
            extrude.update();
        }).resource(this);

        await extrude.commit();
        this.editor.selection.deselectRegion(regions[0]);
    }
}

export class MirrorCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const mirror = new MirrorFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        mirror.curve = curves[0];

        const pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);

        mirror.origin = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            mirror.normal = p2.clone().sub(p1).cross(constructionPlane.n);
            mirror.update();
        }).resource(this);

        await mirror.commit();
    }
}

export class DeleteCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedCurves, ...this.editor.selection.selectedSolids, ...this.editor.selection.selectedRegions];
        const ps = items.map(i => this.editor.db.removeItem(i));
        await Promise.all(ps);
    }
}

export class ModeCommand extends Command {
    async execute(): Promise<void> {
        const object = [...this.editor.selection.selectedSolids][0];
        let model = this.editor.db.lookup(object);
        model = model.Duplicate().Cast<c3d.Solid>(c3d.SpaceType.Solid);

        const l = model.GetCreatorsCount();
        let recent = model.SetCreator(l - 1);
        switch (recent.IsA()) {
            case c3d.CreatorType.ElementarySolid:
                const factory = new ElementarySolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
                factory.solid = object;
                const gizmo = new ElementarySolidGizmo(this.editor, factory.points);
                await gizmo.execute(async (point, index) => {
                    factory.points[index] = point;
                    await factory.update();
                }).resource(this);

                await factory.commit();

                break;
        }
    }
}