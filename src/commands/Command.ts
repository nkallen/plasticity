import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import { EditorSignals } from '../Editor';
import { GeometryDatabase, TemporaryObject } from "../GeometryDatabase";
import MaterialDatabase from "../MaterialDatabase";
import { PointPicker } from '../PointPicker';
import { SelectionInteractionManager } from "../selection/SelectionInteraction";
import { HasSelection, ModifiesSelection } from "../selection/SelectionManager";
import { SnapManager } from "../SnapManager";
import { Cancel, CancellableRegistor } from "../util/Cancellable";
import { Helpers } from "../util/Helpers";
import { Scheduler } from "../util/Scheduler";
import * as visual from "../VisualModel";
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
import FilletFactory, { Max } from './fillet/FilletFactory';
import { FilletGizmo } from './fillet/FilletGizmo';
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
 * for the purposes of UNDO.
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
    static get title() {
        return this.name.replace(/Command/, '').toLowerCase();
    }

    constructor(protected readonly editor: EditorLike) {
        super();
    }

    abstract execute(): Promise<void>;

    // Commands are enqueued before execution because of all the of promises;
    // It is possible to enqueue a command and cancel it before it's executed (e.g., if two commands are executed quickly).
    async executeSafely() {
        if (this.state !== 'None') throw Cancel;

        return this.execute();
    }
}

export class SphereCommand extends Command {
    async execute(): Promise<void> {
        const sphere = new SphereFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        const pointPicker = new PointPicker(this.editor);

        const [p1,] = await pointPicker.execute().resource(this);
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
        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const [p1,] = await pointPicker.execute().resource(this);
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
        const region = new RegionFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        region.contours = [...this.editor.selection.selectedCurves];
        await region.commit();
    }
}

export class RegionBooleanCommand extends Command {
    async execute(): Promise<void> {
        const region = new RegionBooleanFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        region.regions = [...this.editor.selection.selectedRegions];
        await region.commit();
    }
}

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [p1,] = await pointPicker.execute().resource(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        }).resource(this);
        await circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        cylinder.base = p1;
        cylinder.radius = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            cylinder.height = p3;
            cylinder.update();
        }).resource(this);
        await cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute(): Promise<void> {
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const [p1,] = await pointPicker.execute().resource(this);
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
        const makeCurve = new CurveAndContourFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

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
                const [point,] = await pointPicker.execute(async (p: THREE.Vector3) => {
                    makeCurve.nextPoint = p;
                    if (!makeCurve.isValid) return;
                    makeCurve.closed = makeCurve.wouldBeClosed(p);
                    await makeCurve.update();
                }).resource(this);
                if (makeCurve.wouldBeClosed(point)) {
                    makeCurve.closed = true;
                    this.finish();
                    break;
                }
                makeCurve.nextPoint = undefined;
                makeCurve.points.push(point);
                await makeCurve.update();
            } catch (e) {
                if (e !== Cancel) throw e;
                break;
            }
        }

        this.editor.signals.contoursChanged.dispatch();
    }
}

export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        for (const curve of this.editor.selection.selectedCurves) contour.curves.push(curve);
        await contour.commit();
    }
}

export class RectCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [p1,] = await pointPicker.execute();
        line.p1 = p1;
        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const makeRect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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
        const [p1,] = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const [p3,] = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        await rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        move.p1 = centroid;
        move.items = objects;

        const moveGizmo = new MoveGizmo(this.editor, centroid);
        await moveGizmo.execute(delta => {
            line.p2 = line.p1.clone().add(delta);
            move.p2 = move.p1.clone().add(delta);
            line.update();
            move.update();
        }).resource(this);
        await line.cancel();
        await move.commit();
    }
}

export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const objects = [...this.editor.selection.selectedSolids];

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [origin,] = await pointPicker.execute().resource(this);
        line.p1 = origin;

        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const line2 = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = origin;

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const union = new UnionFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const intersection = new IntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const difference = new DifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const cut = new CutFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        cut.solid = object1;
        cut.contour = object2;
        await cut.commit();
    }
}

export class FilletCommand extends Command {
    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selectedEdges];
        const item = edges[0].parentItem as visual.Solid;

        const edge = edges[0];

        edge.geometry.computeBoundingBox();
        const centroid = new THREE.Vector3();
        edge.geometry.boundingBox!.getCenter(centroid);

        const fillet = new FilletFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        fillet.item = item;
        fillet.edges = edges;

        const curveEdge = this.editor.db.lookupTopologyItem(edge) as c3d.CurveEdge;
        const normal = curveEdge.EdgeNormal(0.5);
        const filletGizmo = new FilletGizmo(this.editor, centroid, new THREE.Vector3(normal.x, normal.y, normal.z));

        const max = new Max(fillet);
        max.start();
        await filletGizmo.execute(async delta =>
            max.exec(delta)
        ).resource(this);

        await fillet.commit();
    }
}

export class OffsetFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const offsetFace = new OffsetFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        offsetFace.solid = parent;
        offsetFace.faces = faces;

        // FIXME move this and things like it into the factory
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new OffsetFaceGizmo(this.editor, point, normal);

        await gizmo.execute(delta => {
            offsetFace.schedule(async () => {
                await offsetFace.transaction('direction', async () => {
                    offsetFace.direction = new THREE.Vector3(delta, 0, 0);
                    await offsetFace.update();
                });
            });
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

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const removeFace = new RemoveFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        removeFace.commit();
    }
}

export class PurifyFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new PurifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class CreateFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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

        const actionFace = new ActionFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        actionFace.solid = parent;
        actionFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new MoveGizmo(this.editor, point);

        await gizmo.execute(delta => {
            actionFace.schedule(async () => {
                await actionFace.transaction('direction', async () => {
                    actionFace.direction = delta;
                    await actionFace.update();
                });
            });
        }).resource(this);

        await actionFace.commit();
    }
}

export class FilletFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const refilletFace = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        refilletFace.solid = parent;
        refilletFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new OffsetFaceGizmo(this.editor, point, normal);

        await gizmo.execute((delta) => {
            refilletFace.schedule(async () => {
                await refilletFace.transaction('direction', async () => {
                    refilletFace.direction = new THREE.Vector3(delta, 0, 0);
                    await refilletFace.update();
                });
            });
        }).resource(this);

        await refilletFace.commit();
    }
}

export class SuppleFaceCommand extends Command { async execute(): Promise<void> { } }

export class MergerFaceCommand extends Command { async execute(): Promise<void> { } }

export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        loft.contours = curves;
        await loft.commit();
    }
}

export class ExtrudeCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const extrude = new ExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        extrude.curves = curves;

        const pointPicker = new PointPicker(this.editor);
        const [p1,] = await pointPicker.execute().resource(this);

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
        const extrude = new RegionExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
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
        const mirror = new MirrorFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        mirror.curve = curves[0];

        const pointPicker = new PointPicker(this.editor);
        const [p1, n] = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);

        mirror.origin = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            mirror.normal = p2.clone().sub(p1).cross(n);
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
                const factory = new ElementarySolidFactory(this.editor.db, this.editor.materials, this.editor.signals);
                factory.solid = object;
                const gizmo = new ElementarySolidGizmo(this.editor, factory.points);
                await gizmo.execute((point, index) => {
                    factory.schedule(async () => {
                        factory.points[index] = point;
                        await factory.update();
                    });
                }).resource(this);

                await factory.commit();

                break;
        }
    }
}