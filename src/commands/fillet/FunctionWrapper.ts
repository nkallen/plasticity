import * as c3d from '../../kernel/kernel';

export class FunctionWrapper {
    constructor(readonly underlying: c3d.CubicFunction) {
    }

    t!: number; value!: number;
    InsertValue(t: number, value: number) {
        this.t = t; this.value = value;
        this.underlying.InsertValue(t, value);
    }

    toJSON() {
        return {
            t: this.t, value: this.value
        };
    }
}
