import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory, PhantomInfo } from '../../command/GeometryFactory';
import * as THREE from "three";
import { MaterialOverride } from '../../editor/DatabaseLike';

export class RebuildFactory extends GeometryFactory {
    dup!: c3d.Item;
    private model!: c3d.Solid;
    private _item!: visual.Solid;

    set item(item: visual.Solid) {
        this._item = item;
        const model = this.db.lookup(item);
        this.model = model;
        this.dup = model.Duplicate().Cast<c3d.Item>(model.IsA());
    }

    private _index!: number;
    get index(): number { return this._index }
    set index(index: number | undefined) {
        index = index ?? this.dup.GetCreatorsCount() - 1;
        index = Math.min(this.dup.GetCreatorsCount() - 1, index);
        index = Math.max(0, index);
        this._index = index;
    }

    private bases!: c3d.SpaceItem[];

    async calculate() {
        const { dup, index } = this;

        for (let l = dup.GetCreatorsCount() - 1, i = l; i > index; i--) {
            const creator = dup.GetCreator(i)!;
            creator.SetStatus(c3d.ProcessState.Skip);
        }
        for (let i = 0; i <= index; i++) {
            const creator = dup.GetCreator(i)!;
            creator.SetStatus(c3d.ProcessState.Success);
        }

        const creator = dup.GetCreator(index)!;
        const bases = await creator.GetBasisItems_async();
        this.bases = bases;

        dup.RebuildItem(c3d.CopyMode.Copy, null);
        return dup;
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        const result = [];
        for (const basis of this.bases) {
            if (basis.IsA() === c3d.SpaceType.Solid) {
                result.push({
                    phantom: basis.Cast<c3d.Solid>(basis.IsA()),
                    material: phantom_blue,
                })
            }
        }
        return result;
    }

    get originalItem() { return this._item }
}

const mesh_blue = new THREE.MeshBasicMaterial();
mesh_blue.color.setHex(0x0000ff);
mesh_blue.opacity = 0.1;
mesh_blue.transparent = true;
mesh_blue.fog = false;
mesh_blue.polygonOffset = true;
mesh_blue.polygonOffsetFactor = 0.1;
mesh_blue.polygonOffsetUnits = 1;

const phantom_blue: MaterialOverride = {
    mesh: mesh_blue
}
