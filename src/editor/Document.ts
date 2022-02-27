import * as fs from 'fs';
import * as THREE from "three";
import { CameraMemento, ConstructionPlaneMemento, EditorOriginator, ViewportMemento } from "./History";

export class PlasticityDocument {
    constructor(private readonly originator: EditorOriginator) { }

    static async load(filename: string, into: EditorOriginator): Promise<PlasticityDocument> {
        const data = await fs.promises.readFile(filename);
        const json = JSON.parse(data.toString()) as PlasticityJSON;
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
        const c3d = await fs.promises.readFile(json.db.uri);
        console.info(filename);
        console.time("load backup");
        await into.db.deserialize(c3d);
        console.timeEnd("load backup");
        return new PlasticityDocument(into);
    }

    async save(filename: string) {
        const memento = this.originator.saveToMemento();
        const { db } = memento;
        const c3d = await db.serialize();
        const c3dFilename = `${filename}.c3d`
        await fs.promises.writeFile(c3dFilename, c3d);

        const viewports = this.originator.viewports.map(v => v.saveToMemento());

        const json = {
            asset: {
                version: 1.0
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
            // nodes: [
            //     {
            //         name: "",
            //         item: 1
            //     },
            //     {
            //         name: "",
            //         group: 1,
            //         children: [],
            //     }
            // ],
            items: [...db.geometryModel.values()].map(({ view }) => [
                {
                    material: 1
                }
            ]),
            // groups: [
            //     {
            //          name: "",
            //     }
            // ],
            materials: [...memento.materials.materials.values()].map(mat => (
                {
                    name: mat.name,
                    pbrMetallicRoughness: {
                        baseColorFactor: [1, 1, 1, 1],
                        metallicFactor: 1,
                        roughnessFactor: 0.1,
                    },
                    emmissiveFactor: 0,
                } as MaterialJSON
            ))
        } as PlasticityJSON;
        const string = JSON.stringify(json);
        return fs.promises.writeFile(filename, string);
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

interface GeometryDatabaseJSON {
    uri: string;
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
}