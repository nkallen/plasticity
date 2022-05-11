import { Editor } from '../../editor/Editor';
import { createRef, render } from 'preact';
import { CompositeDisposable, Disposable } from 'event-kit';
import { Measure } from './Measure';

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private readonly disposable = new CompositeDisposable();

        connectedCallback() { this.render() }
        disconnectedCallback() { this.disposable.dispose() }

        render() {
            const ref = createRef();
            render(
                <div class="p-4">
                    <div ref={ref} class="flex flex-col m-1"></div>
                </div>, this);

            FrameRate: {
                const stats = Measure.get('frame-rate');
                let cont = true;
                requestAnimationFrame(function loop() {
                    stats.update();
                    if (cont) requestAnimationFrame(loop)
                });
                this.disposable.add(new Disposable(() => { cont = false }));
                ref.current.appendChild(stats.dom);
            }

            Factories: {
                const stats = Measure.get('factory-calculate');
                stats.showPanel(1);
                ref.current.appendChild(stats.dom);
            }

            Triangulation: {
                const stats = Measure.get('create-mesh');
                stats.showPanel(1);
                ref.current.appendChild(stats.dom);
            }
        }
    }
    customElements.define('plasticity-stats', Anon);
}

