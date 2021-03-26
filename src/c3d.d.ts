
declare module "*c3d.node" {
    declare interface AttributeContainer {
        GetStyle(): number;
        SetStyle(number): void;
    }

    declare class SpaceItem {

    }

    declare class Item extends SpaceItem implements AttributeContainer {
        GetItemName(): number;
        CreateMesh(StepData, FormNote, RegDuplicate?): Item;

        GetStyle(): number;
        SetStyle(number): void;
        IsA(): number;
        Cast<T extends Item>(number): T;
    }

    declare class Model {
        AddItem(item: Item): Item;
    }

    declare class FormNote {
        constructor(boolean, boolean, boolean, boolean, boolean);
    }

    declare class StepData {
        constructor(number, number);
    }

    var Enabler: {
        EnableMathModules(string, string);
    };

    declare class CartPoint3D {
        constructor(number, number, number);
    }

    declare class NameMaker {

    }

    declare class SNameMaker extends NameMaker {
        constructor(number, number, number);
    }

    declare class Name {

    }

    declare interface MeshBuffer {
        index: Uint32Array;
        position: Float32Array;
        normal: Float32Array;
        style: number;
        simpleName: number;
        name: Name;
    }

    declare class Mesh extends Item {
        GetMeshType(): number;
        GetApexes(): Float32Array;
        GetEdges(): [Float32Array];
        GetBuffers(): [MeshBuffer];

        IsClosed(): boolean;
    }

    var ActionSolid: {
        ElementarySolid(points: CartPoint3D[], number, NameMaker);
    }
}