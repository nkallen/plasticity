import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from './Editor';
import MaterialDatabase from './MaterialDatabase';
import { assertUnreachable, WeakValueMap } from './Util';
import * as visual from './VisualModel';

export interface TemporaryObject {
    cancel(): void;
    commit(): void;
}

let counter = 0;

export class GeometryDatabase {
    readonly drawModel = new Set<visual.SpaceItem>();
    readonly scene = new THREE.Scene();
    private readonly geometryModel = new c3d.Model();
    private readonly name2topologyItem = new WeakValueMap<c3d.SimpleName, visual.TopologyItem>();

    constructor(
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals) { }

    addItem(object: c3d.Item, mesh?: visual.SpaceItem): visual.SpaceItem {
        mesh = mesh ?? this.object2mesh(object);
        this.geometryModel.AddItem(object, counter);
        mesh.userData.simpleName = counter;
        counter++

        this.scene.add(mesh);
        this.drawModel.add(mesh);

        this.signals.objectAdded.dispatch(mesh); // FIXME dispatch object and mesh, since snapmanager is just looking up the object immediately afterward
        this.signals.sceneGraphChanged.dispatch();
        return mesh;
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
        const mesh = this.object2mesh(object, 0.01, false);
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

    private lookupItem(object: visual.Item): c3d.Item {
        const { item } = this.geometryModel.GetItemByName(object.userData.simpleName);
        return item;
    }

    // FIXME rethink error messages and consider using Family rather than isA for curve3d?
    lookup(object: visual.Solid): c3d.Solid;
    lookup(object: visual.SpaceInstance<any>): c3d.SpaceInstance;
    lookup(object: visual.Item): c3d.Item;
    lookup(object: visual.Item): c3d.Item {
        const item = this.lookupItem(object);
        if (!item) throw "looking up invalid objects";

        if (object instanceof visual.SpaceInstance) {
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
            const result = solid.FindEdgeByName(object.userData.name);
            if (!result) throw "cannot find edge";
            return result;
        } else if (object instanceof visual.Face) {
            const result = solid.FindFaceByName(object.userData.name);
            if (!result) throw "cannot find face";
            return result;
        }
        assertUnreachable(object);
    }

    lookupByName(name: c3d.Name): visual.TopologyItem {
        const result = this.name2topologyItem.get(name.Hash());
        if (!result) throw "item not found";
        return result;
    }

    private object2mesh(obj: c3d.Item, sag: number = 0.005, wireframe: boolean = true): visual.SpaceItem {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const note = new c3d.FormNote(wireframe, true, true, false, false);
        const item = obj.CreateMesh(stepData, note);
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        switch (obj.IsA()) {
            case c3d.SpaceType.SpaceInstance: {
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
                    this.name2topologyItem.set(edge.name.Hash(), line);
                    edges.addEdge(line);
                }
                solid.addEdges(edges.build());

                const faces = new visual.FaceGroupBuilder();
                const grids = mesh.GetBuffers();
                for (const grid of grids) {
                    const material = this.materials.mesh(grid, mesh.IsClosed());
                    const face = new visual.Face(grid, material);
                    this.name2topologyItem.set(grid.name.Hash(), face);
                    faces.addFace(face);
                }
                solid.addFaces(faces.build());
                return solid.build();
            }
        }
    }
}