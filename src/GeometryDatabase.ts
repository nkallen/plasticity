import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from './Editor';
import MaterialDatabase from './MaterialDatabase';
import { assertUnreachable } from './Util';
import * as visual from './VisualModel';

export interface TemporaryObject {
    cancel(): void;
    commit(): void;
}

export class GeometryDatabase {
    readonly geometryModel = new c3d.Model();
    readonly drawModel = new Set<visual.SpaceItem>();
    readonly scene = new THREE.Scene();

    constructor(
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals) { }

    addItem(object: c3d.Item, mesh?: visual.SpaceItem) {
        mesh = mesh ?? this.object2mesh(object);
        const o = this.geometryModel.AddItem(object);
        mesh.userData.simpleName = o.GetItemName();

        this.scene.add(mesh);
        this.drawModel.add(mesh);

        this.signals.objectAdded.dispatch(mesh);
        this.signals.sceneGraphChanged.dispatch();
    }

    addTemporaryItems(objects: c3d.Item[]): TemporaryObject {
        const temps: TemporaryObject[] = [];
        for (const object of objects) {
            const temp = this.addTemporaryItem(object);
            temps.push(temp);
        }
        return {
            cancel: () => {
                temps.forEach(t => t.cancel())
            },
            commit: () => {
                temps.forEach(t => t.commit())
            }
        }
    }

    addTemporaryItem(object: c3d.Item): TemporaryObject {
        const mesh = this.object2mesh(object, 0.05, false);
        this.scene.add(mesh);
        return {
            cancel: () => {
                mesh.dispose();
                this.scene.remove(mesh);
            },
            commit: () => {
                this.addItem(object, mesh);
            }
        }
    }

    removeItem(object: visual.Item) {
        this.scene.remove(object);
        this.drawModel.delete(object);
        this.geometryModel.DetachItem(this.lookupItem(object));

        this.signals.objectRemoved.dispatch(object);
        this.signals.sceneGraphChanged.dispatch();
    }

    lookupItem(object: visual.Item): c3d.Item {
        const { item } = this.geometryModel.GetItemByName(object.userData.simpleName);
        return item;
    }

    // FIXME rethink error messages and consider using Family rather than isA for curve3d?
    lookup(object: visual.Curve3D): c3d.Curve3D;
    lookup(object: visual.Solid): c3d.Solid;
    lookup(object: visual.SpaceInstance<any>): c3d.SpaceInstance;
    lookup(object: visual.Item): c3d.SpaceItem {
        const item = this.lookupItem(object);
        if (object instanceof visual.Curve3D) {
            const instance = item.Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
            const spaceItem = instance.GetSpaceItem();
            return spaceItem.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        } else if (object instanceof visual.SpaceInstance) {
            const instance = item.Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
            return instance;
        } else if (object instanceof visual.Solid) {
            const solid = item.Cast<c3d.Solid>(c3d.SpaceType.Solid);
            return solid;
        }
        throw new Error("not yet implemented");
    }

    lookupTopologyItem(object: visual.Face): c3d.Face;
    lookupTopologyItem(object: visual.Edge): c3d.Edge;
    lookupTopologyItem(object: visual.Edge | visual.Face): c3d.TopologyItem {
        const parent = object.parentItem;
        const parentModel = this.lookupItem(parent);
        const solid = parentModel.Cast<c3d.Solid>(c3d.SpaceType.Solid);

        if (object instanceof visual.Edge) {
            return solid.FindEdgeByName(object.userData.name);
        } else if (object instanceof visual.Face) {
            return solid.FindFaceByName(object.userData.name);
        }
        assertUnreachable(object);
    }

    private object2mesh(obj: c3d.Item, sag: number = 0.005, wireframe: boolean = true): visual.SpaceItem {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const note = new c3d.FormNote(wireframe, true, true, false, false);
        const item = obj.CreateMesh(stepData, note, null);
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        switch (mesh.GetMeshType()) {
            case c3d.SpaceType.Curve3D: {
                const curve3D = new visual.Curve3DBuilder();
                const edges = mesh.GetEdges();
                let material = this.materials.line(obj as c3d.SpaceInstance);
                for (const edge of edges) {
                    const line = new visual.CurveSegment(edge, material);
                    curve3D.addCurveSegment(line);
                }
                return new visual.SpaceInstance(curve3D.build());
            }
            // case c3d.SpaceType.Point3D: {
            //     const apexes = mesh.GetApexes();
            //     const geometry = new THREE.BufferGeometry();
            //     geometry.setAttribute('position', new THREE.Float32BufferAttribute(apexes, 3));
            //     const points = new THREE.Points(geometry, this.materials.point(obj));
            //     return points;
            // }
            default: {
                const solid = new visual.SolidBuilder();
                const edges = new visual.CurveEdgeGroupBuilder();
                const lineMaterial = this.materials.line();
                const polygons = mesh.GetEdges(true);
                for (const edge of polygons) {
                    const line = new visual.CurveEdge(edge, lineMaterial, this.materials.lineDashed());
                    edges.addEdge(line);
                    line.renderOrder = 999;
                }
                solid.addEdges(edges.build());

                const faces = new visual.FaceGroupBuilder();
                const grids = mesh.GetBuffers();
                for (const grid of grids) {
                    const material = this.materials.mesh(grid, mesh.IsClosed());
                    const face = new visual.Face(grid, material);
                    faces.addFace(face);
                }
                solid.addFaces(faces.build());
                return solid.build();
            }
        }
    }
}