import box from 'bootstrap-icons/icons/box.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import { Editor } from '../../editor/Editor';
import Command from '../../commands/Command';
import * as cmd from '../../commands/GeometryCommands';
import centerCircle from './img/center-circle.svg';
import twoPointCircle from './img/two-point-circle.svg';
import threePointCircle from './img/three-point-circle.svg';
import centerPointArc from './img/center-point-arc.svg';
import threePointArc from './img/three-point-arc.svg';
import centerEllipse from './img/center-ellipse.svg';
import threePointEllipse from './img/three-point-ellipse.svg';
import curve from './img/curve.svg';
import cut from './img/cut.svg';
import cylinder from './img/cylinder.svg';
import difference from './img/difference.svg';
import extrude from './img/extrude.svg';
import fillet from './img/fillet.svg';
import intersection from './img/intersection.svg';
import line from './img/line.svg';
import loft from './img/loft.svg';
import mirror from './img/mirror.svg';
import move from './img/move.svg';
import offsetFace from './img/offset-face.svg';
import centerRectangle from './img/center-rectangle.svg';
import cornerRectangle from './img/corner-rectangle.svg';
import threePointRectangle from './img/three-point-rectangle.svg';
import regularPolygon from './img/regular-polygon.svg';
import characterCurve from './img/character-curve.svg';
import spiral from './img/spiral.svg';
import { default as draftSolid, default as rotate } from './img/rotate.svg';
import scale from './img/scale.svg';
import sphere from './img/sphere.svg';
import union from './img/union.svg';
import changePoint from './img/union.svg';
import trim from './img/trim.svg';
import join from './img/join.svg';

export const icons = new Map<typeof Command, string>();
icons.set(cmd.MoveCommand, move);
icons.set(cmd.RotateCommand, rotate);
icons.set(cmd.ScaleCommand, scale);
icons.set(cmd.FilletCommand, fillet);
icons.set(cmd.IntersectionCommand, intersection);
icons.set(cmd.DifferenceCommand, difference);
icons.set(cmd.UnionCommand, union);
icons.set(cmd.CutCommand, cut);
icons.set(cmd.OffsetFaceCommand, offsetFace);
icons.set(cmd.DraftSolidCommand, draftSolid);
icons.set(cmd.RemoveFaceCommand, trash);
icons.set(cmd.CreateFaceCommand, offsetFace);
icons.set(cmd.ActionFaceCommand, move);
icons.set(cmd.FilletFaceCommand, fillet);
icons.set(cmd.PurifyFaceCommand, trash);
icons.set(cmd.CurveCommand, curve);
icons.set(cmd.SphereCommand, sphere);
icons.set(cmd.CenterCircleCommand, centerCircle);
icons.set(cmd.TwoPointCircleCommand, twoPointCircle);
icons.set(cmd.ThreePointCircleCommand, threePointCircle);
icons.set(cmd.CenterPointArcCommand, centerPointArc);
icons.set(cmd.ThreePointArcCommand, threePointArc);
icons.set(cmd.CenterEllipseCommand, centerEllipse);
icons.set(cmd.ThreePointEllipseCommand, threePointEllipse);
icons.set(cmd.PolygonCommand, regularPolygon);
icons.set(cmd.LineCommand, line);
icons.set(cmd.ThreePointRectangleCommand, threePointRectangle);
icons.set(cmd.CornerRectangleCommand, cornerRectangle);
icons.set(cmd.CenterRectangleCommand, centerRectangle);
icons.set(cmd.CylinderCommand, cylinder);
icons.set(cmd.BoxCommand, box);
icons.set(cmd.LoftCommand, loft);
icons.set(cmd.ExtrudeCommand, extrude);
icons.set(cmd.ExtrudeRegionCommand, extrude);
icons.set(cmd.MirrorCommand, mirror);
icons.set(cmd.JoinCurvesCommand, join);
// icons.set(cmd.RegionCommand, mirror);
// icons.set(cmd.RegionBooleanCommand, mirror);
icons.set(cmd.SpiralCommand, spiral);
icons.set(cmd.CharacterCurveCommand, characterCurve);
// icons.set(cmd.MergerFaceCommand, offsetFace);
icons.set(cmd.ChangePointCommand, changePoint);
icons.set(cmd.TrimCommand, trim);
icons.set(cmd.RemovePointCommand, trash);
icons.set(cmd.FilletCurveCommand, fillet);

export const tooltips = new Map<typeof Command, string>();
tooltips.set(cmd.MoveCommand, "Move");
tooltips.set(cmd.RotateCommand, "Rotate");
tooltips.set(cmd.ScaleCommand, "Scale");
tooltips.set(cmd.FilletCommand, "Fillet");
tooltips.set(cmd.IntersectionCommand, "Boolean intersection");
tooltips.set(cmd.DifferenceCommand, "Boolean difference");
tooltips.set(cmd.UnionCommand, "Boolean union");
tooltips.set(cmd.CutCommand, "Cut solid with curve");
tooltips.set(cmd.OffsetFaceCommand, "Offset face");
tooltips.set(cmd.DraftSolidCommand, "Draft solid");
tooltips.set(cmd.RemoveFaceCommand, "Delete face");
tooltips.set(cmd.CreateFaceCommand, "Copy face");
tooltips.set(cmd.ActionFaceCommand, "Move face");
tooltips.set(cmd.FilletFaceCommand, "Modify fillet of face");
tooltips.set(cmd.PurifyFaceCommand, "Remove fillet");
tooltips.set(cmd.CurveCommand, "Curve");
tooltips.set(cmd.SphereCommand, "Sphere");
tooltips.set(cmd.CenterCircleCommand, "Center and radius circle");
tooltips.set(cmd.TwoPointCircleCommand, "Two-point circle");
tooltips.set(cmd.ThreePointCircleCommand, "Three-point circle");
tooltips.set(cmd.CenterPointArcCommand, "Center-point arc");
tooltips.set(cmd.ThreePointArcCommand, "Three-point arc");
tooltips.set(cmd.CenterEllipseCommand, "Center ellipse");
tooltips.set(cmd.ThreePointEllipseCommand, "Three-point ellipse");
tooltips.set(cmd.PolygonCommand, "Regular polygon");
tooltips.set(cmd.LineCommand, "Line");
tooltips.set(cmd.ThreePointRectangleCommand, "Three point rectangle");
tooltips.set(cmd.CornerRectangleCommand, "Corner rectangle");
tooltips.set(cmd.CenterRectangleCommand, "Center rectangle");
tooltips.set(cmd.CylinderCommand, "Cylinder");
tooltips.set(cmd.BoxCommand, "Box");
tooltips.set(cmd.LoftCommand, "Loft");
tooltips.set(cmd.ExtrudeCommand, "Extrude");
tooltips.set(cmd.MirrorCommand, "Mirror");
tooltips.set(cmd.JoinCurvesCommand, "Join curves");
tooltips.set(cmd.RegionCommand, "Region");
tooltips.set(cmd.RegionBooleanCommand, "Region Boolean");
tooltips.set(cmd.ExtrudeRegionCommand, "Extrude");
tooltips.set(cmd.SpiralCommand, "Spiral");
tooltips.set(cmd.CharacterCurveCommand, "Custom Function");
tooltips.set(cmd.ChangePointCommand, "Move control point");
tooltips.set(cmd.TrimCommand, "Cut off line segments at intersections of curves");
tooltips.set(cmd.RemovePointCommand, "Remove point from polyline or curve");
tooltips.set(cmd.FilletCurveCommand, "Fillet curve");

export const keybindings = new Map<string, string>();
keybindings.set("gizmo:move:x", "X axis");
keybindings.set("gizmo:move:y", "Y axis");
keybindings.set("gizmo:move:z", "Z axis");
keybindings.set("gizmo:move:xy", "Z plane");
keybindings.set("gizmo:move:yz", "X plane");
keybindings.set("gizmo:move:xz", "Y plane");
keybindings.set("gizmo:move:screen", "Screen space");
keybindings.set("gizmo:rotate:x", "X axis");
keybindings.set("gizmo:rotate:y", "Y axis");
keybindings.set("gizmo:rotate:z", "Z axis");
keybindings.set("gizmo:rotate:screen", "Screen space");
keybindings.set("command:abort", "Abort");
keybindings.set("command:finish", "Finish");
keybindings.set("gizmo:curve:line-segment", "Line segment");
keybindings.set("gizmo:curve:arc", "Arc");
keybindings.set("gizmo:curve:polyline", "Polyline");
keybindings.set("gizmo:curve:nurbs", "NURBS");
keybindings.set("gizmo:curve:hermite", "Hermite");
keybindings.set("gizmo:curve:bezier", "Bezier");
keybindings.set("gizmo:curve:cubic-spline", "Cubic spline");
keybindings.set("gizmo:curve:undo", "Undo");
keybindings.set("gizmo:line:undo", "Undo");
keybindings.set("gizmo:fillet:add", "Add variable fillet point");
keybindings.set("gizmo:fillet:distance", "Distance");
keybindings.set("gizmo:circle:mode", "Toggle vertical/horizontal");
keybindings.set("gizmo:polygon:add-vertex", "Add a vertex");
keybindings.set("gizmo:polygon:subtract-vertex", "Subtract a vertex");
keybindings.set("gizmo:spiral:angle", "Angle");
keybindings.set("gizmo:spiral:radius", "Radius");
keybindings.set("gizmo:spiral:length", "Length");

export default (editor: Editor): void => {
    editor.registry.add('ispace-viewport', {
        'command:move': () => editor.enqueue(new cmd.MoveCommand(editor)),
        'command:rotate': () => editor.enqueue(new cmd.RotateCommand(editor)),
        'command:scale': () => editor.enqueue(new cmd.ScaleCommand(editor)),
        'command:sphere': () => editor.enqueue(new cmd.SphereCommand(editor)),
        'command:center-circle': () => editor.enqueue(new cmd.CenterCircleCommand(editor)),
        'command:center-rectangle': () => editor.enqueue(new cmd.CenterRectangleCommand(editor)),
        'command:line': () => editor.enqueue(new cmd.LineCommand(editor)),
        'command:curve': () => editor.enqueue(new cmd.CurveCommand(editor)),
        'command:rect': () => editor.enqueue(new cmd.ThreePointRectangleCommand(editor)),
        'command:box': () => editor.enqueue(new cmd.BoxCommand(editor)),
        'command:union': () => editor.enqueue(new cmd.UnionCommand(editor)),
        'command:intersection': () => editor.enqueue(new cmd.IntersectionCommand(editor)),
        'command:difference': () => editor.enqueue(new cmd.DifferenceCommand(editor)),
        'command:cut': () => editor.enqueue(new cmd.CutCommand(editor)),
        'command:fillet': () => editor.enqueue(new cmd.FilletCommand(editor)),
        'command:fillet-curve': () => editor.enqueue(new cmd.FilletCurveCommand(editor)),
        'command:modify-face': () => editor.enqueue(new cmd.OffsetFaceCommand(editor)),
        'command:delete': () => editor.enqueue(new cmd.DeleteCommand(editor)),
        'command:mode': () => editor.enqueue(new cmd.ModeCommand(editor)),
        'command:extrude': () => editor.enqueue(new cmd.ExtrudeCommand(editor)),
        'command:trim': () => editor.enqueue(new cmd.TrimCommand(editor)),
    })
}
