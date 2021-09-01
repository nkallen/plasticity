import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../GeometryFactory';

export class RebuildFactory extends GeometryFactory {
    dup!: c3d.Item;
    index!: number;

    async calculate() {
        const { dup, index } = this;

        for (let l = dup.GetCreatorsCount() - 1, i = l; i > index; i--) {
            const creator = dup.GetCreator(i)!;
            creator.SetStatus(c3d.ProcessState.Skip);
        }

        dup.RebuildItem(c3d.CopyMode.Copy, null);
        return dup;
    }
}