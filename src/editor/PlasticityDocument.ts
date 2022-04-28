import * as fs from 'fs';
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { assertUnreachable } from '../util/Util';
import * as visual from '../visual_model/VisualModel';
import { Empty, EmptyId, EmptyInfo } from './Empties';
import { GroupId } from './Groups';
import { CameraMemento, ConstructionPlaneMemento, EditorOriginator, EmptyMemento, GroupMemento, MaterialMemento, NodeMemento, SceneMemento, ViewportMemento } from "./History";
import { NodeKey, Nodes, NodeTransform } from './Nodes';

export class PlasticityDocument {
    constructor(private readonly originator: EditorOriginator) { }

    static async open(filename: string, into: EditorOriginator) {
        const data = await fs.promises.readFile(filename);
        const json = JSON.parse(data.toString()) as PlasticityJSON;
        const c3d = await fs.promises.readFile(json.db.uri);
        return this.load(json, c3d, into);
    }

    static async load(json: PlasticityJSON, c3d: Buffer, into: EditorOriginator): Promise<PlasticityDocument> {
        for (const [i, viewport] of json.viewports.entries()) {
            into.viewports[i].restoreFromMemento(new ViewportMemento(
                new CameraMemento(
                    viewport.camera.type,
                    new THREE.Vector3().fromArray(viewport.camera.translation),
                    new THREE.Quaternion().fromArray(viewport.camera.rotation),
                    viewport.camera.zoom),
                new THREE.Vector3().fromArray(viewport.target),
                viewport.isXRay,
                new ConstructionPlaneMemento(
                    new THREE.Vector3().fromArray(viewport.constructionPlane.normal),
                    new THREE.Vector3().fromArray(viewport.constructionPlane.translation),
                )
            ));
        };
        const materials = new Map<number, { name: string, material: THREE.MeshPhysicalMaterial }>();
        for (const [i, mat] of json.materials.entries()) {
            const name = mat.name;
            const base = mat.pbrMetallicRoughness.baseColorFactor
            const material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color().fromArray(base),
                opacity: base[3],
                metalness: mat.pbrMetallicRoughness.metallicFactor,
                roughness: mat.pbrMetallicRoughness.roughnessFactor,
                clearcoat: mat.clearcoatFactor,
                clearcoatRoughness: mat.clearcoatRoughnessFactor,
                ior: mat.ior,
                sheenColor: mat.sheenColorFactor ? new THREE.Color().fromArray(mat.sheenColorFactor) : undefined,
                sheenRoughness: mat.sheenRoughnessFactor,
                specularIntensity: mat.specularFactor,
                specularColor: mat.specularColorFactor ? new THREE.Color().fromArray(mat.specularColorFactor) : undefined,
                transmission: mat.transmissionFactor,
                emissive: mat.emissiveFactor,
            });
            materials.set(i, { name, material });
        }
        into.materials.restoreFromMemento(new MaterialMemento(json.materials.length, materials));

        console.time("load backup");
        const items = await into.db.deserialize(c3d);
        console.timeEnd("load backup");

        const node2material = new Map<NodeKey, number>();
        const node2name = new Map<NodeKey, string>();
        const node2transform = new Map<NodeKey, NodeTransform>();
        for (const [i, node] of json.nodes.entries()) {
            const key = keyForNode(node, items);
            if (node.material !== undefined) {
                node2material.set(key, node.material);
            }
            if (node.name !== undefined) {
                node2name.set(key, node.name);
            }
            if (node.translation !== undefined && node.rotation !== undefined && node.scale !== undefined) {
                const position = new THREE.Vector3().fromArray(node.translation);
                const quaternion = new THREE.Quaternion().fromArray(node.rotation);
                const scale = new THREE.Vector3().fromArray(node.scale);
                node2transform.set(key, { position, quaternion, scale });
            }
        }

        const buffers = await Promise.all(json.images.map(info => fs.promises.readFile(info.uri)));
        const images = buffers.map((buf, i) =>
            into.images.add(json.images[i].uri, buf)
        );
        await Promise.all(images);

        into.empties.deserialize(json.empties);

        const group2children: Map<GroupId, Set<NodeKey>> = new Map();
        const member2parent: Map<NodeKey, GroupId> = new Map();
        for (const [i, group] of json.groups.entries()) {
            const children = group.children.map(i => keyForNode(json.nodes[i], items));
            group2children.set(i, new Set(children));
            for (const child of children) {
                member2parent.set(child, i);
            }
        }
        into.scene.restoreFromMemento(new SceneMemento(
            0,
            new NodeMemento(node2material, new Set(), new Set(), new Set(), node2name, node2transform),
            new GroupMemento(json.groups.length, member2parent, group2children))
        );

        await into.contours.transaction(() => into.contours.rebuild());
        return new PlasticityDocument(into);
    }

    async serialize(filename: string) {
        const memento = this.originator.saveToMemento();
        const { db, empties, scene: { nodes, groups } } = memento;
        const { images } = this.originator;
        const c3d = await db.serialize();
        const c3dFilename = `${filename}.c3d`

        const viewports = this.originator.viewports.map(v => v.saveToMemento());

        let i, j;
        i = 0;
        const materialId2position = new Map<number, number>();
        for (const id of memento.materials.materials.keys()) {
            materialId2position.set(id, i++);
        }
        i = 0; j = 0;
        const node2position = new Map<NodeKey, number>();
        const allNodes = [];
        for (const { view } of [...db.geometryModel.values()]) {
            if (db.automatics.has(view.simpleName)) continue;
            const id = db.version2id.get(view.simpleName)!;
            const key = Nodes.itemKey(id);
            allNodes.push({ 'item': j++, key });
            node2position.set(key, i++);
        }
        j = 0;
        for (const id of [...groups.group2children.keys()]) {
            const key = Nodes.groupKey(id);
            allNodes.push({ 'group': j++, key });
            node2position.set(key, i++);
        }
        j = 0;
        for (const id of [...empties.id2info.keys()]) {
            const key = Nodes.emptyKey(id);
            allNodes.push({ 'empty': j++, key });
            node2position.set(key, i++);
        }

        const json = {
            asset: {
                version: 1.2,
            },
            db: {
                uri: c3dFilename,
            },
            viewports: viewports.map(viewport => (
                {
                    camera: {
                        type: viewport.camera.mode,
                        // fov: viewport.camera.fov,
                        translation: viewport.camera.position.toArray(),
                        rotation: viewport.camera.quaternion.toArray(),
                        zoom: viewport.camera.zoom,
                    } as ViewportCameraJSON,
                    target: viewport.target.toArray(),
                    constructionPlane: {
                        normal: viewport.constructionPlane.n.toArray(),
                        translation: viewport.constructionPlane.o.toArray()
                    },
                    isXRay: viewport.isXRay,
                } as ViewportJSON
            )),
            nodes: allNodes.map(nodeInfo => {
                const { key, item, group, empty } = nodeInfo;
                const materialId = nodes.node2material.get(key);
                const material = materialId !== undefined ? materialId2position.get(materialId)! : undefined;
                const name = nodes.node2name.get(key);
                const transform = nodes.node2transform.get(key);
                const { tag } = Nodes.dekey(key);
                const node = {} as NodeJSON;
                if (tag === 'Item') node.item = item;
                else if (tag === 'Group') node.group = group;
                else if (tag === 'Empty') node.empty = empty;
                else if (tag === 'VirtualGroup') throw new Error('invalid condition');
                else assertUnreachable(tag);
                if (material !== undefined) node.material = material;
                if (name !== undefined) node.name = name;
                if (transform !== undefined) {
                    node.translation = transform.position.toArray();
                    node.rotation = transform.quaternion.toArray() as [number, number, number, number];
                    node.scale = transform.scale.toArray();
                }
                return node;
            }),
            groups: [...groups.group2children].map(([gid, children]) => {
                return {
                    children: [...children].map(child => node2position.get(child)!),
                } as GroupJSON
            }),
            empties: [...empties.id2info].map(([id, info]) => {
                const empty = {} as EmptyJSON;
                empty.type = info.tag;
                switch (info.tag) {
                    case 'Image':
                        empty.image = info.path;
                        break;
                    default: assertUnreachable(info.tag);
                }
                return empty;
            }),
            images: [...images.paths].map((p) => { return { uri: p } as ImageJSON }),
            materials: [...memento.materials.materials.values()].map(mat => {
                const { name, material } = mat;
                return {
                    name: name,
                    pbrMetallicRoughness: {
                        baseColorFactor: [...material.color.toArray(), material.opacity] as [number, number, number, number],
                        metallicFactor: material.metalness,
                        roughnessFactor: material.roughness,
                    },
                    emmissiveFactor: material.emissive,
                    clearcoatFactor: material.clearcoat,
                    clearcoatRoughnessFactor: material.clearcoatRoughness,
                    ior: material.ior,
                    sheenColorFactor: material.sheenColor.toArray() as [number, number, number],
                    sheenRoughnessFactor: material.sheenRoughness,
                    specularFactor: material.specularIntensity,
                    specularColorFactor: material.specularColor.toArray() as [number, number, number],
                    transmissionFactor: material.transmission,
                } as MaterialJSON
            }),
        } as PlasticityJSON;
        const string = JSON.stringify(json);
        const write = async () => {
            await fs.promises.writeFile(c3dFilename, c3d);
            return fs.promises.writeFile(filename, string);
        }
        return { json, c3d, write };
    }

    async save(filename: string) {
        const { write } = await this.serialize(filename);
        await write();
    }
}

type TranslationJSON = [number, number, number];

type RotationJSON = [number, number, number, number];

interface ViewportCameraJSON {
    type: 'perspective' | 'orthographic';
    translation: TranslationJSON;
    rotation: RotationJSON;
    zoom: number;
}

interface ConstructionPlaneJSON {
    normal: TranslationJSON;
    translation: TranslationJSON;
}

interface ViewportJSON {
    camera: ViewportCameraJSON;
    target: TranslationJSON;
    constructionPlane: ConstructionPlaneJSON;
    isXRay: boolean;
}

interface GroupJSON {
    children: number[]
}

export interface EmptyJSON {
    type: EmptyInfo['tag'];
    image?: string;
}

export interface ImageJSON {
    uri: string;
}

interface GeometryDatabaseJSON {
    uri: string;
}

interface NodeJSON {
    item?: c3d.SimpleName;
    group?: GroupId;
    empty?: EmptyId;
    material: number;
    name: string;

    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
}

interface MaterialJSON {
    name: string,
    pbrMetallicRoughness: {
        baseColorFactor: [number, number, number, number];
        metallicFactor: number;
        roughnessFactor: number;
    };
    clearcoatFactor?: number;
    clearcoatRoughnessFactor?: number;
    ior?: number;
    sheenColorFactor?: [number, number, number];
    sheenRoughnessFactor?: number;
    specularFactor?: number;
    specularColorFactor?: [number, number, number];
    transmissionFactor?: number;
    emissiveFactor?: number;
}

interface PlasticityJSON {
    db: GeometryDatabaseJSON;
    viewports: ViewportJSON[];
    materials: MaterialJSON[];
    nodes: NodeJSON[];
    groups: GroupJSON[];
    empties: EmptyJSON[];
    images: ImageJSON[];
}

function keyForNode(node: NodeJSON, items: visual.Item[]): NodeKey {
    if (node.item !== undefined) return Nodes.itemKey(items[node.item].simpleName)
    else if (node.group !== undefined) return Nodes.groupKey(node.group!);
    else if (node.empty !== undefined) return Nodes.emptyKey(node.empty!);
    else throw new Error("invalid node");
}