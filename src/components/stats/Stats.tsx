import Stats from 'stats.js';
import { Editor } from '../../editor/Editor';
import { createRef, render } from 'preact';
import { CompositeDisposable, Disposable } from 'event-kit';

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private readonly disposable = new CompositeDisposable();

        connectedCallback() { this.render() }
        disconnectedCallback() { this.disposable.dispose() }

        render() {
            const ref = createRef();
            render(
                <div class="p-4">
                    <h1 class="mb-4 text-xs font-bold text-neutral-100">Performance stats</h1>
                    <div ref={ref}></div>
                </div>, this);

            const stats = new Stats();
            stats.dom.setAttribute('style', '');
            stats.dom.setAttribute('class', 'shadow-md inline-block');

            let cont = true;
            requestAnimationFrame(function loop() {
                stats.update();
                if (cont) requestAnimationFrame(loop)
            });
            this.disposable.add(new Disposable(() => { cont = false }));

            ref.current.appendChild(stats.dom);
        }

    }
    customElements.define('plasticity-stats', Anon);
}