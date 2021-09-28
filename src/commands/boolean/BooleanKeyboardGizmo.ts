import c3d from '../../../build/Release/c3d.node';
import { CancellablePromise } from "../../util/Cancellable";
import { AbstractCommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";
import { PossiblyBooleanFactory } from './BooleanFactory';

export type BooleanKeyboardEvent = { tag: 'boolean', type: number } | { tag: 'new-body' }

export class BooleanKeyboardGizmo extends AbstractCommandKeyboardInput<(e: BooleanKeyboardEvent) => void> {
    private active?: CancellablePromise<void>;
    private cb!: (e: BooleanKeyboardEvent) => void;
    private map = commands(this.name).map;

    constructor(private readonly name: string, editor: EditorLike) {
        super(name, editor, commands(name).commands);
    }

    execute(cb: (e: BooleanKeyboardEvent) => void) {
        this.cb = cb;
        return new CancellablePromise<void>((resolve, reject) => {
            const dispose = () => this.active?.dispose();
            return { dispose, finish: resolve };
        });
    }

    protected resolve(cb: (e: BooleanKeyboardEvent) => void, command: string) {
        switch (command) {
            case `gizmo:${this.name}:new-body`:
                cb({ tag: 'new-body' });
                break;
            default:
                cb({ tag: 'boolean', type: this.map[command] });
        }
    }

    prepare(factory: PossiblyBooleanFactory<any>) {
        return this.execute(e => {
            switch (e.tag) {
                case 'boolean':
                    factory.newBody = false;
                    factory.operationType = e.type;
                    factory.update();
                    break;
                case 'new-body':
                    factory.newBody = true;
                    factory.update();
                    break;
            }
        })
    }

    toggle(bool: boolean) {
        if (!bool) {
            this.active?.finish();
            this.active = undefined;
        } else {
            if (this.active === undefined) {
                this.active = super.execute(this.cb);
            }
        }
    }
}

function commands(name: string) {
    const commands = new Array<string>();
    const map: Record<string, number> = {};

    map[`gizmo:${name}:union`] = c3d.OperationType.Union;
    map[`gizmo:${name}:difference`] = c3d.OperationType.Difference;
    map[`gizmo:${name}:intersect`] = c3d.OperationType.Intersect;
    for (const key in map) commands.push(key);
    commands.push(`gizmo:${name}:new-body`);
    return { commands, map }
}