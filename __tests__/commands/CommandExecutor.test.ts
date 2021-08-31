/**
 * @jest-environment jsdom
 */

import Command from "../../src/commands/Command";
import { CommandExecutor, EditorLike } from "../../src/commands/CommandExecutor";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { SelectionCommandManager } from "../../src/commands/SelectionCommandManager";
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { Viewport } from "../../src/components/viewport/Viewport";
import ContourManager from "../../src/editor/ContourManager";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import { EditorOriginator, History } from "../../src/editor/History";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import ModifierManager from "../../src/editor/ModifierManager";
import { PlanarCurveDatabase } from "../../src/editor/PlanarCurveDatabase";
import { RegionManager } from "../../src/editor/RegionManager";
import { SnapManager } from "../../src/editor/SnapManager";
import { Selection, SelectionManager } from "../../src/selection/SelectionManager";
import { Delay } from "../../src/util/SequentialExecutor";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

describe(CommandExecutor, () => {
    let materials: MaterialDatabase;
    let db: GeometryDatabase;
    let signals: EditorSignals;
    let selectionGizmo: SelectionCommandManager;
    let registry: CommandRegistry;
    let originator: EditorOriginator;
    let history: History;
    let snaps: SnapManager;
    let selection: Selection;
    let curves: PlanarCurveDatabase;
    let gizmos: GizmoMaterialDatabase;
    let editor: any
    let regions: RegionManager;
    let contours: ContourManager;
    let modifiers: ModifierManager;
    let viewports: Viewport[];

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        gizmos = new GizmoMaterialDatabase(signals);
        db = new GeometryDatabase(materials, signals);
        registry = new CommandRegistry();
        const selection = new SelectionManager(db, materials, signals);
        snaps = new SnapManager(db, gizmos, signals);
        curves = new PlanarCurveDatabase(db);
        regions = new RegionManager(db, curves);
        contours = new ContourManager(curves, regions, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selection.selected, snaps, curves, modifiers);
        history = new History(originator, signals);
        editor = {
            materials, sprites: gizmos, signals, db, registry, selection, snaps, curves, originator, history, contours, selectionGizmo
        } as EditorLike;
        selectionGizmo = new SelectionCommandManager(editor);
    })

    let executor: CommandExecutor;
    beforeEach(() => {
        executor = new CommandExecutor(editor);
    })

    test('basic successful execution', async () => {
        const command = new DelayedCommand(editor);
        const p = executor.enqueue(command);
        expect(command['state']).toBe('None');
        command.delay.resolve();
        await p;
        expect(command['state']).toBe('Finished');
    });

    test('basic unsuccessful execution', async () => {
        const command = new DelayedCommand(editor);
        const p = executor.enqueue(command);
        expect(command['state']).toBe('None');
        command.delay.reject();
        await p;
        expect(command['state']).toBe('Cancelled');
    });

    test('unsuccessful execution catches exception and continues to next command', async () => {
        const command1_fails = new ErroringCommand(editor);
        const command2_succeeds = new FastCommand(editor);
        await executor.enqueue(command1_fails);
        await executor.enqueue(command2_succeeds);

        expect(command1_fails['state']).toBe('Cancelled');
        expect(command2_succeeds['state']).toBe('Finished');
    });

    test('enqueue cancels active commands and executes the most recent', async () => {
        const command1 = new DelayedCommand(editor);
        const command2 = new DelayedCommand(editor);
        const command3 = new DelayedCommand(editor);

        const p1 = executor.enqueue(command1);
        const p2 = executor.enqueue(command2);
        const p3 = executor.enqueue(command3);

        expect(command1['state']).toBe('Finished');
        expect(command2['state']).toBe('None');
        expect(command3['state']).toBe('None');

        command1.delay.reject();
        command2.delay.resolve();
        command3.delay.resolve();

        await p1;
        await p2;
        await p3;

        expect(command1['state']).toBe('Finished');
        expect(command2['state']).toBe('None');
        expect(command3['state']).toBe('Finished');
    });
});

class DelayedCommand extends Command {
    delay = new Delay<void>();

    async execute(): Promise<void> {
        await this.delay.promise;
    }
}

class ErroringCommand extends Command {
    async execute(): Promise<void> {
        throw new Error("I'm an error");
    }
}

class FastCommand extends Command {
    async execute(): Promise<void> {
    }
}