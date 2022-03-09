import { NumberHelper } from "../../command/MiniGizmos";
import { Viewport } from "../../components/viewport/Viewport";
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from "../../editor/EditorSignals";
import MaterialDatabase from "../../editor/MaterialDatabase";
import { CancellableRegisterable } from "../../util/CancellableRegisterable";
import { CancellableRegistor } from "../../util/CancellableRegistor";
import { PhantomLineFactory } from '../line/LineFactory';

export class CenterCircleHelper implements CancellableRegisterable {
    private readonly number = new NumberHelper();
    private readonly line = new PhantomLineFactory(this.db, this.materials, this.signals);

    constructor(private readonly db: DatabaseLike, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) {
    }

    set p1(p1: THREE.Vector3) {
        this.line.p1 = p1;
    }

    set p2(p2: THREE.Vector3) {
        this.number.position.copy(p2).sub(this.line.p1).multiplyScalar(0.5).add(this.line.p1);
        this.line.p2 = p2;
    }

    update(viewport: Viewport) {
        this.number.onPointPickerMove(viewport, this.line.p2.distanceTo(this.line.p1));
        this.line.update();
    }

    cancel() {
        this.number.cancel();
        this.line.cancel();
    }

    finish() {
        this.number.finish();
        this.line.finish();
    }

    interrupt() {
        this.number.interrupt();
        this.line.interrupt();
    }

    resource(reg: CancellableRegistor): this {
        this.number.resource(reg);
        this.line.resource(reg);
        return this;
    }
}
