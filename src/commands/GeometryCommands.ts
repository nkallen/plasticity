import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { AxisSnap } from "../editor/SnapManager";
import * as visual from "../editor/VisualModel";
import { Finish } from "../util/Cancellable";
import { mode } from "./AbstractGizmo";
import { CenterPointArcFactory, ThreePointArcFactory } from "./arc/ArcFactory";
import { CutFactory, DifferenceFactory, IntersectionFactory, UnionFactory } from './boolean/BooleanFactory';
import BoxFactory from './box/BoxFactory';
import { CharacterCurveDialog } from "./character-curve/CharacterCurveDialog";
import CharacterCurveFactory from "./character-curve/CharacterCurveFactory";
import { CircleFactory, ThreePointCircleFactory, TwoPointCircleFactory } from './circle/CircleFactory';
import { CircleKeyboardEvent, CircleKeyboardGizmo } from "./circle/CircleKeyboardGizmo";
import Command from "./Command";
import { ChangePointFactory, RemovePointFactory } from "./control_point/ControlPointFactory";
import { JointOrPolylineOrContourFilletFactory } from "./curve/ContourFilletFactory";
import CurveFactory from "./curve/CurveFactory";
import { CurveKeyboardEvent, CurveKeyboardGizmo, LineKeyboardEvent, LineKeyboardGizmo } from "./curve/CurveKeyboardGizmo";
import JoinCurvesFactory from "./curve/JoinCurvesFactory";
import TrimFactory from "./curve/TrimFactory";
import CylinderFactory from './cylinder/CylinderFactory';
import ElementarySolidFactory from "./elementary_solid/ElementarySolidFactory";
import { ElementarySolidGizmo } from "./elementary_solid/ElementarySolidGizmo";
import { CenterEllipseFactory, ThreePointEllipseFactory } from "./ellipse/EllipseFactory";
import ExtrudeFactory, { RegionExtrudeFactory } from "./extrude/ExtrudeFactory";
import { FilletDialog } from "./fillet/FilletDialog";
import FilletFactory, { Max } from './fillet/FilletFactory';
import { FilletGizmo } from './fillet/FilletGizmo';
import { FilletKeyboardGizmo } from "./fillet/FilletKeyboardGizmo";
import LineFactory from './line/LineFactory';
import LoftFactory from "./loft/LoftFactory";
import { LengthGizmo } from "./MiniGizmos";
import MirrorFactory from "./mirror/MirrorFactory";
import { DraftSolidFactory } from "./modifyface/DraftSolidFactory";
import { ActionFaceFactory, CreateFaceFactory, FilletFaceFactory, OffsetFaceFactory, PurifyFaceFactory, RemoveFaceFactory } from "./modifyface/ModifyFaceFactory";
import { OffsetFaceGizmo } from "./modifyface/OffsetFaceGizmo";
import MoveFactory from './move/MoveFactory';
import { MoveGizmo } from './move/MoveGizmo';
import { ObjectPicker } from "./ObjectPicker";
import { PointPicker } from './PointPicker';
import { PolygonFactory } from "./polygon/PolygonFactory";
import { PolygonKeyboardEvent, PolygonKeyboardGizmo } from "./polygon/PolygonKeyboardGizmo";
import { CenterRectangleFactory, CornerRectangleFactory, ThreePointRectangleFactory } from './rect/RectangleFactory';
import { RegionBooleanFactory } from "./region/RegionBooleanFactory";
import { RegionFactory } from "./region/RegionFactory";
import RotateFactory from './rotate/RotateFactory';
import { RotateGizmo } from './rotate/RotateGizmo';
import ScaleFactory from "./scale/ScaleFactory";
import SphereFactory from './sphere/SphereFactory';
import { SpiralFactory } from "./spiral/SpiralFactory";
import { SpiralGizmo } from "./spiral/SpiralGizmo";

export class SphereCommand extends Command {
    async execute(): Promise<void> {
        const sphere = new SphereFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const pointPicker = new PointPicker(this.editor);

        const { point: p1 } = await pointPicker.execute().resource(this);
        sphere.center = p1;

        await pointPicker.execute(({ point: p2 }) => {
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

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute((e: CircleKeyboardEvent) => {
            switch (e.tag) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
                    break;
            }
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        circle.center = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.point = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class TwoPointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new TwoPointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute((e: CircleKeyboardEvent) => {
            switch (e.tag) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
                    break;
            }
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        circle.p1 = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.p2 = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class ThreePointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new ThreePointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        circle.p1 = p1;

        const { point: p2 } = await pointPicker.execute().resource(this);
        circle.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            circle.p3 = p3;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class CenterPointArcCommand extends Command {
    async execute(): Promise<void> {
        const arc = new CenterPointArcFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        arc.center = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        arc.p2 = p2;

        await pointPicker.execute(({ point: p3, info: { constructionPlane } }) => {
            arc.p3 = p3;
            arc.constructionPlane = constructionPlane;
            arc.update();
        }).resource(this);

        const result = await arc.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class CenterEllipseCommand extends Command {
    async execute(): Promise<void> {
        const ellipse = new CenterEllipseFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        ellipse.center = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        ellipse.p2 = p2;

        await pointPicker.execute(({ point }) => {
            ellipse.p3 = point;
            ellipse.update();
        }).resource(this);

        const result = await ellipse.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class ThreePointEllipseCommand extends Command {
    async execute(): Promise<void> {
        const ellipse = new ThreePointEllipseFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        ellipse.p1 = point;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        ellipse.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            ellipse.p3 = p3;
            ellipse.update();
        }).resource(this);

        const result = await ellipse.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class ThreePointArcCommand extends Command {
    async execute(): Promise<void> {
        const arc = new ThreePointArcFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        arc.p1 = point;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        arc.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            arc.p3 = p3;
            arc.update();
        }).resource(this);

        const result = await arc.commit() as visual.SpaceInstance<visual.Curve3D>;
    }
}

export class PolygonCommand extends Command {
    async execute(): Promise<void> {
        const polygon = new PolygonFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new PolygonKeyboardGizmo(this.editor);
        keyboard.execute((e: PolygonKeyboardEvent) => {
            switch (e.tag) {
                case 'add-vertex':
                    polygon.vertexCount++;
                    break;
                case 'subtract-vertex':
                    polygon.vertexCount--;
                    break;
            }
            polygon.update();
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        polygon.center = point;

        await pointPicker.execute(({ point, info: { constructionPlane } }) => {
            polygon.constructionPlane = constructionPlane;
            polygon.p2 = point;
            polygon.update();
        }).resource(this);

        await polygon.commit();
    }
}

export class SpiralCommand extends Command {
    async execute(): Promise<void> {
        const spiral = new SpiralFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        spiral.p1 = p1;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        spiral.p2 = p2;

        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.restrictToPlaneThroughPoint(p2);

        await pointPicker.execute(({ point }) => {
            spiral.radius = point.distanceTo(p2);
            spiral.p3 = point;
            spiral.update();
        }).resource(this);

        const spiralGizmo = new SpiralGizmo(spiral, this.editor);
        spiralGizmo.execute(params => {
            spiral.update();
        }, mode.Persistent).resource(this);

        await this.finished;

        await spiral.commit();
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
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            circle.point = p2;
            circle.update();
        }).resource(this);
        circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cylinder.base = p1;
        cylinder.radius = p2;
        pointPicker = new PointPicker(this.editor);
        pointPicker.addPlacement(p1);
        await pointPicker.execute(({ point: p3 }) => {
            cylinder.height = p3;
            cylinder.update();
        }).resource(this);

        await cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute(): Promise<void> {
        const line = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.type = c3d.SpaceType.Polyline3D

        const pointPicker = new PointPicker(this.editor);
        const keyboard = new LineKeyboardGizmo(this.editor);
        keyboard.execute((e: LineKeyboardEvent) => {
            switch (e.tag) {
                case 'undo':
                    pointPicker.undo(); // FIXME in theory the overlay needs to be updated;
                    line.points.pop();
                    line.update();
                    break;
            }
        }).resource(this);

        while (true) {
            try {
                const { point } = await pointPicker.execute(async ({ point }) => {
                    line.nextPoint = point;
                    if (!line.isValid) return;
                    line.closed = line.wouldBeClosed(point);
                    await line.update();
                }).resource(this);
                if (line.wouldBeClosed(point)) {
                    line.closed = true;
                    throw Finish;
                }
                line.nextPoint = undefined;
                line.points.push(point);
                await line.update();
            } catch (e) {
                if (e !== Finish) throw e;
                break;
            }
        }

        await line.commit();
    }
}

export class CurveCommand extends Command {
    async execute(): Promise<void> {
        const makeCurve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const keyboard = new CurveKeyboardGizmo(this.editor);
        keyboard.execute((e: CurveKeyboardEvent) => {
            switch (e.tag) {
                case 'type':
                    makeCurve.type = e.type;
                    makeCurve.update();
                    break;
                case 'undo':
                    pointPicker.undo(); // FIXME in theory the overlay needs to be updated;
                    makeCurve.points.pop();
                    makeCurve.update();
                    break;
            }
        }).resource(this);

        while (true) {
            try {
                const { point } = await pointPicker.execute(async ({ point }) => {
                    makeCurve.nextPoint = point;
                    if (!makeCurve.isValid) return;
                    makeCurve.closed = makeCurve.wouldBeClosed(point);
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
    }
}

export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        for (const curve of this.editor.selection.selectedCurves) contour.push(curve);
        await contour.commit();
    }
}

export class ThreePointRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);

        await rect.commit();
    }
}

export class CornerRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap(new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap(new THREE.Vector3(1, -1, 0)));

        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);

        await rect.commit();
    }
}

export class CenterRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap(new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap(new THREE.Vector3(1, -1, 0)));

        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);

        await rect.commit();
    }
}

export class BoxCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const { point: p3 } = await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        await rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute(({ point: p4 }) => {
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

        const moveGizmo = new MoveGizmo(this.editor);
        moveGizmo.position.copy(centroid);
        await moveGizmo.execute(delta => {
            line.p2 = line.p1.clone().add(delta);
            move.p2 = move.p1.clone().add(delta);
            line.update();
            move.update();
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

        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
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
        await pointPicker.execute(({ point: p3 }) => {
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

        const keyboard = new FilletKeyboardGizmo(this.editor);
        const pp = new PointPicker(this.editor);
        const restriction = pp.restrictToEdges(edges);
        keyboard.execute(async e => {
            switch (e.tag) {
                case 'add':
                    const { point } = await pp.execute().resource(this);
                    const { view, model, t } = restriction.match;
                    const normal = model.EdgeNormal(t);
                    const gizmo = new FilletGizmo(this.editor, point, new THREE.Vector3(normal.x, normal.y, normal.z));
                    const fn = fillet.functions.get(view.simpleName)!;
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

        await this.finished;

        const selection = await fillet.commit() as visual.Solid;
        this.editor.selection.selectSolid(selection);
    }
}

export class CharacterCurveCommand extends Command {
    async execute(): Promise<void> {
        const character = new CharacterCurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        character.update(); // It has sensible defaults, so show something immediately

        const characterDialog = new CharacterCurveDialog(character, this.editor.signals);
        const dialog = characterDialog.execute(async params => {
            await character.update();
        }).resource(this);

        // Dialog OK/Cancel buttons trigger completion of the entire command.
        dialog.then(() => this.finish(), () => this.cancel());

        await this.finished;

        character.commit();
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
        const gizmo = new MoveGizmo(this.editor);
        gizmo.position.copy(point);

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

        await pointPicker.execute(({ point: p2 }) => {
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

        await pointPicker.execute(({ point: p2 }) => {
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
        if (recent === null) throw new Error("invalid precondition");
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

export class ChangePointCommand extends Command {
    async execute(): Promise<void> {
        const controlPoint = this.editor.selection.selectedControlPoints.first;

        const changePoint = new ChangePointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        changePoint.controlPoint = controlPoint;

        const gizmo = new MoveGizmo(this.editor);
        gizmo.position.copy(changePoint.originalPosition);
        await gizmo.execute(delta => {
            changePoint.delta = delta;
            changePoint.update();
        }).resource(this);

        const newInstance = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

        const newCurve = newInstance.underlying;
        const newPoint = newCurve.points.findByIndex(controlPoint.index)!;
        this.editor.selection.selectControlPoint(newPoint, newInstance);
    }
}

export class RemovePointCommand extends Command {
    async execute(): Promise<void> {
        const controlPoint = this.editor.selection.selectedControlPoints.first;
        const instance = controlPoint.parentItem;

        const removePoint = new RemovePointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removePoint.controlPoint = controlPoint;

        const newInstance = await removePoint.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selectCurve(newInstance);
    }
}

export class TrimCommand extends Command {
    async execute(): Promise<void> {
        try {
            this.editor.layers.showFragments();

            const picker = new ObjectPicker(this.editor);
            picker.allowCurveFragments();
            const selection = await picker.execute().resource(this);
            const fragment = selection.selectedCurves.first;
            if (fragment === undefined) return;

            const factory = new TrimFactory(this.editor.db, this.editor.materials, this.editor.signals);
            factory.fragment = fragment;
            await factory.commit();
        } finally {
            this.editor.layers.hideFragments();
        }
        this.editor.enqueue(new TrimCommand(this.editor));
    }
}

export class FilletCurveCommand extends Command {
    async execute(): Promise<void> {
        const controlPoints = [...this.editor.selection.selectedControlPoints];
        const factory = new JointOrPolylineOrContourFilletFactory(this.editor.db, this.editor.materials, this.editor.signals);
        factory.contours = this.editor.contours; // FIXME need to DI this in constructor of all factories
        await factory.setControlPoints(controlPoints);
        const gizmo = new LengthGizmo("contour-fillet:radius", this.editor);
        gizmo.length = 0;

        const cornerAngle = factory.cornerAngle;
        gizmo.position.copy(cornerAngle.origin);
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cornerAngle.tau.cross(cornerAngle.axis));
        gizmo.quaternion.copy(quat);

        await gizmo.execute(d => {
            factory.radius = d;
            factory.update();
        }, mode.Persistent).resource(this);

        await factory.commit();
    }
}