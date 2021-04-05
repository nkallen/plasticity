import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from './Editor';
import MaterialDatabase from './MaterialDatabase';
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

    lookupTopologyItem(object: visual.TopologyItem): c3d.TopologyItem {
        const parent = object.parentItem;
        const parentModel = this.lookupItem(parent);
        if (parentModel.IsA() != c3d.SpaceType.Solid) throw "Unexpected return type";
        const solid = parentModel.Cast<c3d.Solid>(c3d.SpaceType.Solid);

        return solid.FindEdgeByName(object.userData.name);
    }

    private object2mesh(obj: c3d.Item, sag: number = 0.005, wireframe: boolean = true): visual.SpaceItem {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const note = new c3d.FormNote(wireframe, true, true, false, false);
        const item = obj.CreateMesh(stepData, note, null);
        if (item.IsA() != c3d.SpaceType.Mesh) throw "Unexpected return type";
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        switch (mesh.GetMeshType()) {
            case c3d.SpaceType.Curve3D: {
                const curve3D = new visual.Curve3DBuilder();
                const edges = mesh.GetEdges();
                let material = this.materials.line(item);
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