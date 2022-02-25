import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { PlaneDatabase } from '../../editor/PlaneDatabase';
import { ConstructionPlaneSnap } from '../../editor/snaps/ConstructionPlaneSnap';
import { SelectionMode } from '../../selection/ChangeSelectionExecutor';
import ceramic_dark from '../../img/matcap/ceramic_dark.png';
import metal_carpaint from '../../img/matcap/metal_carpaint.png';
import reflection_check_horizontal from '../../img/matcap/reflection_check_horizontal.png';
import reflection_check_vertical from '../../img/matcap/reflection_check_vertical.png';
import { ViewportElement } from './Viewport';


export default (editor: Editor) => {

    let counter = 0;

    class Header extends HTMLElement {
        private uid = counter++;

        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            this.render();
            this.viewport.changed.add(this.render);
            editor.signals.selectionModeChanged.add(this.render);
        }

        disconnectedCallback() {
            this.viewport.changed.remove(this.render);
            editor.signals.selectionModeChanged.remove(this.render);
        }

        get viewport() {
            const element = this.parentNode as unknown as ViewportElement;
            return element.model;
        }

        render() {
            const { viewport, uid, viewport: { constructionPlane } } = this;
            const result = (
                <>
                    <div class="flex absolute top-2 right-2 left-2 z-40 justify-between mr-32">
                        <ol class="flex flex-row space-x-0.5">
                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`control-point_${uid}`} checked={editor.selection.mode.has(SelectionMode.ControlPoint)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.ControlPoint)}
                                />
                                <label for={`control-point_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='control-point'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-control-point">Control-Point select</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`edge_${uid}`} checked={editor.selection.mode.has(SelectionMode.CurveEdge)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.CurveEdge, SelectionMode.Curve)}
                                />
                                <label for={`edge_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='edge'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-edge">Edge select</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`face_${uid}`} checked={editor.selection.mode.has(SelectionMode.Face)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.Face)}
                                />
                                <label for={`face_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='face'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-face">Face select</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`solid_${uid}`} checked={editor.selection.mode.has(SelectionMode.Solid)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.Solid)}
                                />
                                <label for={`solid_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='solid'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-solid">Solid select</plasticity-tooltip>
                                </label>
                            </li>
                        </ol>

                        <ol class="flex flex-row space-x-0.5">
                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`ortho_${uid}`} checked={viewport.camera.isPerspectiveCamera} />
                                <label
                                    for={`ortho_${uid}`}
                                    onClick={e => viewport.togglePerspective()}
                                    class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600"
                                >
                                    <plasticity-icon name='ortho'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-orthographic">Perspective/Orthographic</plasticity-tooltip>
                                    <plasticity-menu placement="bottom">
                                        <div class="w-60 border-[0.5px] rounded text-neutral-50 bg-neutral-900 border-neutral-800 shadow-black/20 shadow-md">
                                            <ul>
                                                <li>
                                                    <label for="fov">FOV</label>
                                                    <div class="fields">
                                                        <plasticity-number-scrubber
                                                            name="fov"
                                                            precision={1}
                                                            min={1}
                                                            max={90}
                                                            value={viewport.fov}
                                                            onscrub={e => viewport.fov = e.value}
                                                            onchange={e => viewport.fov = e.value}
                                                            onfinish={() => { }}
                                                        ></plasticity-number-scrubber>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </plasticity-menu>
                                </label>
                            </li>

                            <li class="group">
                                <label for={`overlays_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <input type="checkbox" class="hidden absolute peer" id={`overlays_${uid}`} checked={this.viewport.showOverlays}
                                        onClick={e => viewport.toggleOverlays()}
                                    />
                                    <plasticity-icon name='overlays'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-overlays">Toggle overlays</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`xray_${uid}`} checked={viewport.isXRay}
                                    onClick={e => viewport.toggleXRay()}
                                />
                                <label for={`xray_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='xray'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-x-ray">Toggle X-Ray mode</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`render-mode_${uid}`} checked={viewport.isRenderMode}
                                    onClick={e => viewport.isRenderMode = !viewport.isRenderMode}
                                />
                                <label for={`render-mode_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='render-mode'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-render-mode">Toggle render mode</plasticity-tooltip>
                                    <plasticity-menu placement="bottom">
                                        <div class="min-w-60 border-[0.5px] rounded text-neutral-50 bg-neutral-900 border-neutral-800 shadow-black/20 shadow-md">
                                            <ul>
                                                <li>
                                                    <ol class="flex flex-row space-x-1">
                                                        <li class="group"><img src={ceramic_dark} class="block w-16 group-first:rounded-l group-last:rounded-r" /></li>
                                                        <li class="group"><img src={metal_carpaint} class="block w-16 group-first:rounded-l group-last:rounded-r" /></li>
                                                        <li class="group"><img src={reflection_check_horizontal} class="block w-16 group-first:rounded-l group-last:rounded-r" /></li>
                                                        <li class="group"><img src={reflection_check_vertical} class="block w-16 group-first:rounded-l group-last:rounded-r" /></li>
                                                    </ol>
                                                </li>

                                                <li>
                                                    <label for="form" class="hidden">Visibility</label>
                                                    <div class="fields">
                                                        <input type="checkbox" hidden name="form" id="show-edges" checked={viewport.isShowingEdges} onClick={e => viewport.isShowingEdges = !viewport.isShowingEdges}></input>
                                                        <label for="show-edges">Show edges</label>
                                                        <input type="checkbox" hidden name="form" id="show-faces" checked={viewport.isShowingFaces} onClick={e => viewport.isShowingFaces = !viewport.isShowingFaces}></input>
                                                        <label for="show-faces">Show faces</label>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </plasticity-menu>
                                </label>
                            </li>

                        </ol>
                    </div>
                    {constructionPlane !== PlaneDatabase.XY &&
                        <div class="absolute top-2 left-1/2 z-50">
                            <div class={`flex justify-between items-center py-0.5 px-2 space-x-1 rounded-full shadow-lg bg-neutral-800 hover:bg-neutral-700 ${constructionPlane.isTemp ? 'cursor-pointer' : ''}`} onClick={() => editor.planes.add(constructionPlane as ConstructionPlaneSnap)}>
                                <div class="p-1 text-xs text-neutral-300 group-hover:text-neutral-100">{constructionPlane.isTemp ? "Temporary" : constructionPlane.name}</div>
                                {constructionPlane.isTemp &&
                                    <button class="p-1 rounded group text-neutral-300">
                                        <plasticity-icon name="save"></plasticity-icon>
                                    </button>
                                }
                            </div>
                        </div>
                    }
                </>
            );
            render(result, this);
        }
    }

    customElements.define('plasticity-viewport-header', Header);
}
