import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { AbstractGizmo, GizmoTriggerStrategy } from "./AbstractGizmo";
import { Viewport } from "../components/viewport/Viewport";


export class AdvancedGizmoTriggerStrategy<I, O> extends GizmoTriggerStrategy<I, O> {
    private readonly allGizmos: GizmoInfo<I>[] = [];
    private readonly raycaster = new THREE.Raycaster();

    execute(): Disposable {
        const disposable = new CompositeDisposable();
        let winner: GizmoInfo<I> | undefined = undefined;
        for (const viewport of this.editor.viewports) {
            const { renderer: { domElement } } = viewport;

            const onPointerDown = (event: PointerEvent) => {
                if (winner === undefined)
                    return;
                winner.gizmo.stateMachine!.update(viewport, event);
                winner.gizmo.stateMachine!.pointerDown(() => {
                    domElement.ownerDocument.body.setAttribute("gizmo", winner!.gizmo.title);

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    return winner!.addEventHandlers(event);
                });
            };

            const onPointerHover = (event: PointerEvent) => {
                if (winner !== undefined) {
                    const tag = winner.gizmo.stateMachine!.state.tag;
                    if (tag != 'none' && tag != 'hover')
                        return;
                }
                const camera = viewport.camera;
                const pointer = viewport.getNormalizedMousePosition(event);
                this.raycaster.setFromCamera(pointer, camera);
                const intersections = [];
                for (const info of this.allGizmos) {
                    const hits = this.raycaster.intersectObject(info.gizmo.picker);
                    if (hits.length === 0)
                        continue;
                    const first = hits[0];
                    intersections.push({ distance: first.distance, info });
                }

                if (intersections.length === 0) {
                    winner?.gizmo.stateMachine!.interrupt();
                    winner = undefined;
                } else {
                    intersections.sort((a, b) => a.distance - b.distance);
                    const newWinner = intersections[0].info;
                    if (newWinner !== winner)
                        winner?.gizmo.stateMachine!.interrupt();
                    winner = newWinner;
                    winner.gizmo.stateMachine!.update(viewport, event);
                    winner.gizmo.stateMachine!.pointerHover();
                }
            };

            // NOTE: Gizmos take priority over viewport controls; capture:true it's received first here.
            domElement.addEventListener('pointerdown', onPointerDown, { capture: true });
            domElement.addEventListener('pointermove', onPointerHover);
            disposable.add(new Disposable(() => {
                domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
                domElement.removeEventListener('pointermove', onPointerHover);
                domElement.ownerDocument.body.removeAttribute('gizmo');
            }));
        }
        return disposable;
    }

    register(gizmo: AbstractGizmo<I>, viewport: Viewport, addEventHandlers: (event: MouseEvent) => Disposable): Disposable {
        this.allGizmos.push({ gizmo, addEventHandlers });
        return this.registerCommands(gizmo, viewport, addEventHandlers);
    }
}
interface GizmoInfo<I> {
    gizmo: AbstractGizmo<I>;
    addEventHandlers: (event: PointerEvent) => Disposable;
}
