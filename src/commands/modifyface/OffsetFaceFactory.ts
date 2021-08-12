import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import { ValidationError } from '../GeometryFactory';
import { ModifyFaceFactory, OffsetFaceParams } from './ModifyFaceFactory';


export class OffsetFaceFactory extends ModifyFaceFactory implements OffsetFaceParams {
    angle = 0;
    operationType = c3d.ModifyingType.Offset;
    set distance(d: number) { this.direction = new THREE.Vector3(d, 0, 0); }

    protected async computeGeometry() {
        const { solidModel, facesModel, direction, angle } = this;

        let solid = solidModel;

        let transformed = false;
        if (direction.lengthSq() > 0) {
            const params = new c3d.ModifyValues();
            params.way = c3d.ModifyingType.Offset;
            params.direction = new c3d.Vector3D(direction.x, direction.y, direction.z);
            solid = await c3d.ActionDirect.FaceModifiedSolid_async(solid, c3d.CopyMode.Copy, params, facesModel, this.names);
            transformed = true;
        }
        if (angle !== 0) {
            const face = facesModel[0];
            // this doesn't work in general, but it's a placeholder for a more robust impl
            const placement = face.GetSurfacePlacement(); // world coordinates with Z along normal
            const control = face.GetControlPlacement(); // Y is normal

            const faces = face.GetNeighborFaces();
            const bbox = new c3d.Cube();
            for (const face of faces) face.AddYourGabaritTo(bbox);
            const rect = bbox.ProjectionRect(control); // convert bbox world coordinates into normal coordinates

            const v = control.GetVectorFrom(rect.GetLeft(), 0, 0, c3d.LocalSystemType3D.CartesianSystem);
            placement.Move(v);
            
            const names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);
            solid = await c3d.ActionSolid.DraftSolid_async(solid, c3d.CopyMode.Copy, placement, angle, faces, c3d.FacePropagation.All, false, names);
            transformed = true;
        }
        if (transformed) return solid;
        else throw new ValidationError("no changes");
    }
}
