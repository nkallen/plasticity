import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { AxisSnap, CurveSnap, Layers, ParametricPointSnap, PointSnap } from "../editor/snaps/Snap";
import * as visual from "../editor/VisualModel";
import { Finish, Interrupt } from "../util/Cancellable";
import { point2point } from "../util/Conversion";
import { Mode } from "./AbstractGizmo";
import { CenterPointArcFactory, ThreePointArcFactory } from "./arc/ArcFactory";
import { BooleanDialog, CutDialog } from "./boolean/BooleanDialog";
import { BooleanFactory, CutAndSplitFactory, DifferenceFactory, IntersectionFactory, UnionFactory } from './boolean/BooleanFactory';
import { BooleanKeyboardGizmo } from "./boolean/BooleanKeyboardGizmo";
import { PossiblyBooleanCenterBoxFactory, PossiblyBooleanCornerBoxFactory, PossiblyBooleanThreePointBoxFactory } from './box/BoxFactory';
import { CharacterCurveDialog } from "./character-curve/CharacterCurveDialog";
import CharacterCurveFactory from "./character-curve/CharacterCurveFactory";
import { EditCircleDialog } from "./circle/CircleDialog";
import { CenterCircleFactory, EditCircleFactory, ThreePointCircleFactory, TwoPointCircleFactory } from './circle/CircleFactory';
import { CircleKeyboardGizmo } from "./circle/CircleKeyboardGizmo";
import Command from "./Command";
import { ChangePointFactory, RemovePointFactory } from "./control_point/ControlPointFactory";
import { BridgeCurvesDialog } from "./curve/BridgeCurvesDialog";
import BridgeCurvesFactory from "./curve/BridgeCurvesFactory";
import { JointOrPolylineOrContourFilletFactory } from "./curve/ContourFilletFactory";
import CurveFactory, { CurveWithPreviewFactory } from "./curve/CurveFactory";
import { CurveKeyboardEvent, CurveKeyboardGizmo, LineKeyboardGizmo } from "./curve/CurveKeyboardGizmo";
import JoinCurvesFactory from "./curve/JoinCurvesFactory";
import OffsetCurveFactory from "./curve/OffsetContourFactory";
import TrimFactory from "./curve/TrimFactory";
import { PossiblyBooleanCylinderFactory } from './cylinder/CylinderFactory';
import { CenterEllipseFactory, ThreePointEllipseFactory } from "./ellipse/EllipseFactory";
import { RevolutionDialog } from "./evolution/RevolutionDialog";
import RevolutionFactory from "./evolution/RevolutionFactory";
import { RevolutionGizmo } from "./evolution/RevolutionGizmo";
import { PossiblyBooleanExtrudeFactory } from "./extrude/ExtrudeFactory";
import { ExtrudeGizmo } from "./extrude/ExtrudeGizmo";
import { FilletDialog } from "./fillet/FilletDialog";
import { MaxFilletFactory } from './fillet/FilletFactory';
import { FilletGizmo, MagnitudeGizmo } from './fillet/FilletGizmo';
import { ChamferAndFilletKeyboardGizmo } from "./fillet/FilletKeyboardGizmo";
import { ValidationError } from "./GeometryFactory";
import LineFactory from './line/LineFactory';
import LoftFactory from "./loft/LoftFactory";
import { DistanceGizmo } from "./MiniGizmos";
import { MirrorFactory, SymmetryFactory } from "./mirror/MirrorFactory";
import { MirrorGizmo } from "./mirror/MirrorGizmo";
import { DraftSolidFactory } from "./modifyface/DraftSolidFactory";
import { ActionFaceFactory, CreateFaceFactory, FilletFaceFactory, PurifyFaceFactory, RemoveFaceFactory } from "./modifyface/ModifyFaceFactory";
import { OffsetFaceFactory } from "./modifyface/OffsetFaceFactory";
import { OffsetFaceGizmo } from "./modifyface/OffsetFaceGizmo";
import { MultilineDialog } from "./multiline/MultilineDialog";
import MultilineFactory from "./multiline/MultilineFactory";
import { ObjectPicker } from "./ObjectPicker";
import { PointPicker } from './PointPicker';
import { PolygonFactory } from "./polygon/PolygonFactory";
import { PolygonKeyboardGizmo } from "./polygon/PolygonKeyboardGizmo";
import { CenterRectangleFactory, CornerRectangleFactory, ThreePointRectangleFactory } from './rect/RectangleFactory';
import { RegionFactory } from "./region/RegionFactory";
import { PossiblyBooleanSphereFactory } from './sphere/SphereFactory';
import { SpiralFactory } from "./spiral/SpiralFactory";
import { SpiralGizmo } from "./spiral/SpiralGizmo";
import { MoveDialog } from "./translate/MoveDialog";
import { MoveGizmo } from './translate/MoveGizmo';
import { MoveKeyboardGizmo } from "./translate/MoveKeyboardGizmo";
import { RotateDialog } from "./translate/RotateDialog";
import { RotateGizmo } from './translate/RotateGizmo';
import { ScaleDialog } from "./translate/ScaleDialog";
import { ScaleGizmo } from "./translate/ScaleGizmo";
import { MoveFactory, RotateFactory, ScaleFactory } from './translate/TranslateFactory';

const Y = new THREE.Vector3(0, 1, 0);

export class SphereCommand extends Command {
    async execute(): Promise<void> {
        const sphere = new PossiblyBooleanSphereFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) sphere.solid = selection.solids.first;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        sphere.center = p1;
        pointPicker.restrictToPlaneThroughPoint(p1);

        const keyboard = new BooleanKeyboardGizmo("sphere", this.editor);
        keyboard.prepare(sphere).resource(this);

        await pointPicker.execute(({ point: p2 }) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
            keyboard.toggle(sphere.isOverlapping);
        }).resource(this);

        const result = await sphere.commit() as visual.Solid;
        selection.addSolid(result);
    }
}

export class CenterCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = point;

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
            }
        }).resource(this);

        pointPicker.restrictToPlaneThroughPoint(point);
        snap.addAdditionalRestrictionsTo(pointPicker, point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.point = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);

        const next = new EditCircleCommand(this.editor);
        next.circle = result;
        this.editor.enqueue(next, false);
    }
}

class EditCircleCommand extends Command {
    circle!: visual.SpaceInstance<visual.Curve3D>

    async execute(): Promise<void> {
        const edit = new EditCircleFactory(this.editor.db, this.editor.materials, this.editor.signals);
        edit.circle = this.circle;

        const dialog = new EditCircleDialog(edit, this.editor.signals);
        await dialog.execute(params => {
            edit.update();
            dialog.render();
        }).rejectOnInterrupt().resource(this);

        const result = await edit.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class TwoPointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new TwoPointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
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
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        arc.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        snap.addAdditionalRestrictionsTo(pointPicker, p1);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;
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
        keyboard.execute(e => {
            switch (e) {
                case 'add-vertex':
                    polygon.vertexCount++;
                    break;
                case 'subtract-vertex':
                    polygon.vertexCount--;
                    break;
                case 'mode':
                    polygon.toggleMode();
                    break;
            }
            polygon.update();
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        polygon.center = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        snap.addAdditionalRestrictionsTo(pointPicker, point);

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
        }, Mode.Persistent).resource(this);

        await this.finished;

        await spiral.commit();
    }
}

export class RegionCommand extends Command {
    async execute(): Promise<void> {
        const region = new RegionFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        region.contours = [...this.editor.selection.selected.curves];
        await region.commit();
    }
}

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const cylinder = new PossiblyBooleanCylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) cylinder.solid = selection.solids.first;

        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        snap.addAdditionalRestrictionsTo(pointPicker, p1);

        const { point: p2 } = await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.point = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);
        circle.cancel();

        cylinder.base = p1;
        cylinder.radius = p2;

        const keyboard = new BooleanKeyboardGizmo("cylinder", this.editor);
        keyboard.prepare(cylinder).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.addSnap(...snap.additionalSnapsFor(p1));
        pointPicker.addAxesAt(p1);
        await pointPicker.execute(({ point: p3 }) => {
            cylinder.height = p3;
            cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        }).resource(this);

        const result = await cylinder.commit() as visual.Solid;
        selection.addSolid(result);
    }
}

export class CurveCommand extends Command {
    protected type = c3d.SpaceType.Hermit3D;
    protected get keyboard() { return new CurveKeyboardGizmo(this.editor) };

    async execute(): Promise<void> {
        this.editor.layers.showControlPoints();
        this.ensure(() => this.editor.layers.hideControlPoints());

        const makeCurve = new CurveWithPreviewFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        makeCurve.type = this.type;

        const pointPicker = new PointPicker(this.editor);
        const keyboard = this.keyboard;
        keyboard.execute((e: CurveKeyboardEvent) => {
            switch (e.tag) {
                case 'type':
                    makeCurve.type = e.type;
                    makeCurve.update();
                    break;
                case 'undo':
                    pointPicker.undo();
                    makeCurve.undo();
                    makeCurve.update();
                    break;
            }
        }).resource(this);

        while (true) {
            if (makeCurve.canBeClosed) {
                pointPicker.clearAddedSnaps();
                pointPicker.addSnap(new PointSnap("closed", makeCurve.startPoint));
            }
            try {
                const { point, info: { snap } } = await pointPicker.execute(async ({ point, info: { snap } }) => {
                    makeCurve.preview.last = point;
                    makeCurve.preview.snap = snap;
                    await makeCurve.preview.update();
                }).rejectOnFinish().resource(this);
                if (makeCurve.wouldBeClosed(point)) {
                    makeCurve.closed = true;
                    throw Finish;
                }
                makeCurve.push(point);
                makeCurve.snap = snap;
                makeCurve.update();
            } catch (e) {
                if (e !== Finish) throw e;
                break;
            }
        }

        makeCurve.preview.cancel();
        const result = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class LineCommand extends CurveCommand {
    protected type = c3d.SpaceType.Polyline3D;
    protected get keyboard() { return new LineKeyboardGizmo(this.editor) };
}

export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        for (const curve of this.editor.selection.selected.curves) contour.push(curve);
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
        line.cancel();

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
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterRectangleCommand extends Command {
    async execute(): Promise<void> {
        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        rect.p1 = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));
        snap.addAdditionalRestrictionsTo(pointPicker, p1);

        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);

        await rect.commit();
    }
}

export class ThreePointBoxCommand extends Command {
    async execute(): Promise<void> {
        const box = new PossiblyBooleanThreePointBoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) box.solid = selection.solids.first;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const { point: p3 } = await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        rect.cancel();

        const keyboard = new BooleanKeyboardGizmo("box", this.editor);
        keyboard.prepare(box).resource(this);

        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute(({ point: p4 }) => {
            box.p4 = p4;
            box.update();
            keyboard.toggle(box.isOverlapping);
        }).resource(this);
        await box.commit();
    }
}

export class CornerBoxCommand extends Command {
    async execute(): Promise<void> {
        const box = new PossiblyBooleanCornerBoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) box.solid = selection.solids.first;

        let pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        const { point: p2, info: { constructionPlane } } = await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);
        rect.cancel();

        box.p1 = p1;
        box.p2 = p2;
        box.constructionPlane = constructionPlane;

        const keyboard = new BooleanKeyboardGizmo("box", this.editor);
        keyboard.prepare(box).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.restrictToLine(p2, box.heightNormal);
        await pointPicker.execute(({ point: p3 }) => {
            box.p3 = p3;
            box.update();
            keyboard.toggle(box.isOverlapping);
        }).resource(this);

        const result = await box.commit() as visual.Solid;
        selection.addSolid(result);
    }
}

export class CenterBoxCommand extends Command {
    async execute(): Promise<void> {
        const box = new PossiblyBooleanCenterBoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) box.solid = selection.solids.first;

        let pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));
        snap.addAdditionalRestrictionsTo(pointPicker, p1)

        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        const { point: p2, info: { constructionPlane } } = await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);
        rect.cancel();

        box.p1 = p1;
        box.p2 = p2;
        box.constructionPlane = constructionPlane;

        const keyboard = new BooleanKeyboardGizmo("box", this.editor);
        keyboard.prepare(box).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.restrictToLine(p2, box.heightNormal);
        await pointPicker.execute(({ point: p3 }) => {
            box.p3 = p3;
            box.update();
            keyboard.toggle(box.isOverlapping);
        }).resource(this);
        await box.commit();
    }
}

export class MoveCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selected.solids, ...this.editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;

        const dialog = new MoveDialog(move, this.editor.signals);
        const gizmo = new MoveGizmo(move, this.editor);
        const keyboard = new MoveKeyboardGizmo(this.editor);

        dialog.execute(async params => {
            await move.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            move.update();
            dialog.render();
        }).resource(this);

        keyboard.prepare(gizmo, move, dialog, this).resource(this);

        await this.finished;

        const selection = await move.commit();
        this.editor.selection.selected.add(selection);
    }
}

export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selected.solids, ...this.editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        scale.items = objects;
        scale.pivot = centroid;

        const gizmo = new ScaleGizmo(scale, this.editor);
        const dialog = new ScaleDialog(scale, this.editor.signals);

        dialog.execute(async params => {
            await scale.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            scale.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const selection = await scale.commit();
        this.editor.selection.selected.add(selection);
    }
}

export class RotateCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selected.solids, ...this.editor.selection.selected.curves];

        if (objects.length === 0) throw new ValidationError("Select something first");

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rotate.items = objects;
        rotate.pivot = centroid;

        const gizmo = new RotateGizmo(rotate, this.editor);
        const dialog = new RotateDialog(rotate, this.editor.signals);

        dialog.execute(async params => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(params => {
            rotate.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const selection = await rotate.commit();
        this.editor.selection.selected.add(selection);
    }
}

abstract class BooleanCommand extends Command {
    protected abstract factory: BooleanFactory;

    async execute(): Promise<void> {
        const { factory } = this;
        factory.resource(this);

        const items = [...this.editor.selection.selected.solids];
        factory.solid = items[0];
        factory.tools = items.slice(1);
        await factory.update();

        const dialog = new BooleanDialog(factory, this.editor.signals);
        await dialog.execute(async params => {
            await factory.update();
        }).resource(this);

        await factory.commit();
    }
}

export class UnionCommand extends BooleanCommand {
    protected factory = new UnionFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class IntersectionCommand extends BooleanCommand {
    protected factory = new IntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class DifferenceCommand extends BooleanCommand {
    protected factory = new DifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class CutCommand extends Command {
    async execute(): Promise<void> {
        const cut = new CutAndSplitFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cut.constructionPlane = this.editor.activeViewport?.constructionPlane;
        cut.solid = this.editor.selection.selected.solids.first;
        cut.curve = this.editor.selection.selected.curves.first;
        cut.faces = [...this.editor.selection.selected.faces];
        await cut.update();

        const dialog = new CutDialog(cut, this.editor.signals);
        await dialog.execute(async params => {
            await cut.update();
        }).resource(this);

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}

export class FilletCommand extends Command {
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selected.edges];
        const edge = edges[edges.length - 1];
        const item = edge.parentItem as visual.Solid;

        const fillet = new MaxFilletFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        fillet.solid = item;
        fillet.edges = edges;
        fillet.start();

        const gizmo = new FilletGizmo(fillet, this.editor, this.point);
        gizmo.showEdges();

        const keyboard = new ChamferAndFilletKeyboardGizmo(this.editor);
        const dialog = new FilletDialog(fillet, this.editor.signals);

        dialog.execute(async params => {
            gizmo.toggle(fillet.mode);
            keyboard.toggle(fillet.mode);
            gizmo.render(params.distance1);
            await fillet.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const pp = new PointPicker(this.editor);
        const restriction = pp.restrictToEdges(edges);
        keyboard.execute(async s => {
            switch (s) {
                case 'add':
                    const { point } = await pp.execute().resource(this);
                    const { view, t } = restriction.match;
                    const fn = fillet.functions.get(view.simpleName)!;
                    const added = gizmo.addVariable(point, restriction.match);
                    added.execute(async delta => {
                        fn.InsertValue(t, delta);
                        await fillet.update();
                    }, Mode.Persistent).resource(this);
                    break;
            }
        }).resource(this);

        gizmo.execute(async params => {
            keyboard.toggle(fillet.mode);
            gizmo.toggle(fillet.mode);
            dialog.toggle(fillet.mode);
            dialog.render();
            await fillet.update();
        }).resource(this);

        await this.finished;

        const result = await fillet.commit() as visual.Solid;
        this.editor.selection.selected.addSolid(result);
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
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const offsetFace = new OffsetFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        offsetFace.solid = parent;
        offsetFace.faces = faces;

        const gizmo = new OffsetFaceGizmo(offsetFace, this.editor, this.point);

        await gizmo.execute(async params => {
            await offsetFace.update();
        }).resource(this);

        const result = await offsetFace.commit() as visual.Solid;
        this.editor.selection.selected.addSolid(result);
    }
}

export class DraftSolidCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const face = faces[0];
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point = point2point(faceModel.Point(0.5, 0.5));

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        draftSolid.solid = parent;
        draftSolid.faces = faces;
        draftSolid.pivot = point;

        const gizmo = new RotateGizmo(draftSolid, this.editor);

        const bbox = new THREE.Box3();
        for (const face of faces) bbox.expandByObject(face);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);
        gizmo.position.copy(centroid);

        await gizmo.execute(params => {
            draftSolid.update();
        }, Mode.Persistent).resource(this);

        await draftSolid.commit();
    }
}

export class RemoveFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new RemoveFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class PurifyFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new PurifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class CreateFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const createFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        createFace.solid = parent;
        createFace.faces = faces;

        await createFace.commit();
    }
}

export class ActionFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const actionFace = new ActionFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        actionFace.solid = parent;
        actionFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point = point2point(faceModel.Point(0.5, 0.5));
        const gizmo = new MoveGizmo(actionFace, this.editor);
        gizmo.position.copy(point);

        await gizmo.execute(async delta => {
            await actionFace.update();
        }).resource(this);

        await actionFace.commit();
    }
}

export class RefilletFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const refillet = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        refillet.solid = parent;
        refillet.faces = faces;

        const gizmo = new DistanceGizmo("refillet-face:distance", this.editor);
        const { point, normal } = OffsetFaceGizmo.placement(this.editor.db.lookupTopologyItem(faces[0]));
        gizmo.quaternion.setFromUnitVectors(Y, normal);
        gizmo.position.copy(point);

        gizmo.state.min = Number.NEGATIVE_INFINITY;

        await gizmo.execute(async distance => {
            refillet.distance = distance;
            await refillet.update();
        }).resource(this);

        await refillet.commit();
    }
}

export class SuppleFaceCommand extends Command { async execute(): Promise<void> { } }

export class MergerFaceCommand extends Command { async execute(): Promise<void> { } }

export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        loft.curves = curves;
        await loft.update();
        const spine = loft.spine;

        // const curve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        // curve.type = c3d.SpaceType.Bezier3D;
        // for (const { point, Z } of spine) {
        //     curve.points.push(point);
        // }
        // await curve.update();

        const { point, Z } = spine[0];
        const gizmo = new MagnitudeGizmo("loft:thickness", this.editor);
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), Z);
        await gizmo.execute(async thickness => {
            loft.thickness = thickness;
            loft.update();
        }, Mode.Persistent).resource(this);

        // curve.cancel();
        await loft.commit();
    }
}

export class ExtrudeCommand extends Command {
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        const extrude = new PossiblyBooleanExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        extrude.solid = selected.solids.first;
        extrude.curves = [...selected.curves];
        if (selected.faces.size > 0) extrude.face = selected.faces.first;
        extrude.region = selected.regions.first;

        const keyboard = new BooleanKeyboardGizmo("extrude", this.editor);
        keyboard.prepare(extrude).resource(this);

        const gizmo = new ExtrudeGizmo(extrude, this.editor);
        gizmo.position.copy(this.point ?? extrude.center);
        gizmo.quaternion.setFromUnitVectors(Y, extrude.direction);

        await gizmo.execute(params => {
            extrude.update();
            keyboard.toggle(extrude.isOverlapping);
        }).resource(this);

        const result = await extrude.commit() as visual.Solid;

        selected.addSolid(result);
        const extruded = extrude.extruded;
        if (!(extruded instanceof visual.Face)) selected.remove(extruded);
    }
}

export class MirrorCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
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

export class SymmetryCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;
        const symmetry = new SymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        symmetry.solid = solid;
        symmetry.origin = new THREE.Vector3();

        const gizmo = new MirrorGizmo(symmetry, this.editor);
        await gizmo.execute(s => {
            symmetry.update();
        }).resource(this);

        await symmetry.commit();
    }
}

export class DeleteCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selected.curves, ...this.editor.selection.selected.solids];
        const ps = items.map(i => this.editor.db.removeItem(i));
        await Promise.all(ps);
    }
}

export class ChangePointCommand extends Command {
    async execute(): Promise<void> {
        const controlPoints = [...this.editor.selection.selected.controlPoints];

        const changePoint = new ChangePointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        changePoint.controlPoints = controlPoints;

        const dialog = new MoveDialog(changePoint, this.editor.signals);
        const gizmo = new MoveGizmo(changePoint, this.editor);

        dialog.execute(async params => {
            await changePoint.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(changePoint.originalPosition);
        await gizmo.execute(delta => {
            changePoint.update();
            dialog.render();
        }).resource(this);

        const newInstance = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

        this.editor.selection.selected.addCurve(newInstance);
    }
}

export class RemovePointCommand extends Command {
    async execute(): Promise<void> {
        const controlPoint = [...this.editor.selection.selected.controlPoints];

        const removePoint = new RemovePointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removePoint.controlPoints = controlPoint;

        const newInstance = await removePoint.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(newInstance);
    }
}

export class TrimCommand extends Command {
    async execute(): Promise<void> {
        this.editor.layers.showFragments();
        this.ensure(() => this.editor.layers.hideFragments());

        const picker = new ObjectPicker(this.editor);
        picker.allowCurveFragments();
        const selection = await picker.execute().resource(this);
        const fragment = selection.curves.first;
        if (fragment === undefined) return;

        const factory = new TrimFactory(this.editor.db, this.editor.materials, this.editor.signals);
        factory.fragment = fragment;
        await factory.commit();

        this.editor.enqueue(new TrimCommand(this.editor), false);
    }
}

export class FilletCurveCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        const controlPoints = [...selected.controlPoints];
        const curve = selected.curves.first;

        const factory = new JointOrPolylineOrContourFilletFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.curves = this.editor.curves; // FIXME need to DI this in constructor of all factories
        if (curve !== undefined) await factory.setCurve(curve);
        await factory.setControlPoints(controlPoints);

        const gizmo = new MagnitudeGizmo("fillet-curve:radius", this.editor);
        gizmo.relativeScale.setScalar(0.8);

        const cornerAngle = factory.cornerAngle;
        if (cornerAngle === undefined) return;

        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(Y, cornerAngle.tau.cross(cornerAngle.axis));
        gizmo.quaternion.copy(quat);
        gizmo.position.copy(cornerAngle.origin);

        await gizmo.execute(d => {
            factory.radius = d;
            factory.update();
        }, Mode.Persistent).resource(this);

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>[];
        selected.addCurve(result[0]);
    }
}

export class BridgeCurvesCommand extends Command {
    async execute(): Promise<void> {
        const factory = new BridgeCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selected = this.editor.selection.selected;

        const mask = this.editor.snaps.layers.mask;
        this.editor.snaps.layers.disableAll();
        this.editor.snaps.layers.enable(Layers.CurveSnap);
        this.editor.snaps.layers.enable(Layers.PlaneSnap);
        this.editor.snaps.layers.enable(Layers.PointSnap);
        this.ensure(() => this.editor.snaps.layers.mask = mask);

        const dialog = new BridgeCurvesDialog(factory, this.editor.signals);
        dialog.execute(params => {
            factory.update();
            dialog.render();
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        pointPicker.raycasterParams.Line2.threshold = 400;
        const line = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.style = 1;
        const { point: p1, info: { snap: snap1 } } = await pointPicker.execute().resource(this);
        if (!(snap1 instanceof CurveSnap || snap1 instanceof ParametricPointSnap)) throw new ValidationError();

        line.push(p1);
        line.push(p1);
        factory.curve1 = snap1.view;
        factory.t1 = snap1.t;

        const { info: { snap: snap2 } } = await pointPicker.execute(({ point: p2, info: { snap: snap2 } }) => {
            line.last = p2;
            line.update();

            if (!(snap2 instanceof CurveSnap || snap2 instanceof ParametricPointSnap)) return;
            factory.curve2 = snap2.view;
            factory.t2 = snap2.t;
            factory.update();
            dialog.render();
        }).resource(this);
        if (!(snap2 instanceof CurveSnap || snap2 instanceof ParametricPointSnap)) throw new ValidationError();
        line.cancel();

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class SelectFilletsCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;
        const model = this.editor.db.lookup(solid);
        const shell = model.GetShell()!;
        const removableFaces = c3d.ActionDirect.CollectFacesForModification(shell, c3d.ModifyingType.Purify, 1);

        const ids = removableFaces.map(f => visual.Face.simpleName(solid.simpleName, model.GetFaceIndex(f)));
        for (const id of ids) {
            const { views } = this.editor.db.lookupTopologyItemById(id);
            const view = views.values().next().value;
            this.editor.selection.selected.addFace(view, solid);
        }
    }
}

export class OffsetCurveCommand extends Command {
    async execute(): Promise<void> {
        const face = this.editor.selection.selected.faces.first;
        const curve = this.editor.selection.selected.curves.first;

        const offsetContour = new OffsetCurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        if (face !== undefined) offsetContour.face = face;
        if (curve !== undefined) offsetContour.curve = curve;

        const gizmo = new MagnitudeGizmo("offset-curve:distance", this.editor);
        gizmo.position.copy(offsetContour.center);
        gizmo.quaternion.setFromUnitVectors(Y, offsetContour.normal);

        await gizmo.execute(async distance => {
            offsetContour.distance = distance;
            offsetContour.update();
        }, Mode.Persistent).resource(this);

        if (face !== undefined) this.editor.selection.selected.removeFace(face, face.parentItem);
        if (curve !== undefined) this.editor.selection.selected.removeCurve(curve);

        const offset = await offsetContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(offset);
    }
}

export class MultilineCommand extends Command {
    async execute(): Promise<void> {
        const curve = this.editor.selection.selected.curves.first;
        const factory = new MultilineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.curve = curve;

        const dialog = new MultilineDialog(factory, this.editor.signals);

        await factory.update();
        await dialog.execute(params => {
            factory.update();
        }).resource(this);

        await factory.commit();
    }
}

export class ThinSolidCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const solid = faces[0].parentItem;

        const faces_ = faces.map(face => this.editor.db.lookupTopologyItem(face));
        const solid_ = this.editor.db.lookup(solid);

        let params = new c3d.SweptValues();
        params.thickness1 = 0;
        params.thickness2 = 0;
        params.shellClosed = false;
        const names = new c3d.SNameMaker(c3d.CreatorType.ThinShellCreator, c3d.ESides.SideNone, 0);
        let result = c3d.ActionSolid.ThinSolid(solid_, c3d.CopyMode.Copy, faces_, [], [], params, names, true);

        params = new c3d.SweptValues();
        params.thickness1 = 30;
        params.shellClosed = true;
        result = c3d.ActionSolid.ThinSolid(result, c3d.CopyMode.Copy, faces_, [], [], params, names, true);

        this.editor.db.addItem(result);
    }
}

export class RevolutionCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const revolution = new RevolutionFactory(this.editor.db, this.editor.materials, this.editor.signals);

        revolution.curves = curves;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        revolution.origin = p1;

        await pointPicker.execute(({ point: p2 }) => {
            revolution.axis = p2.clone().sub(p1);
            revolution.update();
        }).resource(this);

        const dialog = new RevolutionDialog(revolution, this.editor.signals);
        const gizmo = new RevolutionGizmo(revolution, this.editor);

        dialog.execute(async params => {
            await revolution.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(params => {
            revolution.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const revolved = await revolution.commit();
        this.editor.selection.selected.add(revolved);
    }
}


module.hot?.accept();