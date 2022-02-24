import { CompositeDisposable } from 'event-kit';
import { Editor } from '../../editor/Editor';
import { Menu, MenuPlacement } from './MenuManager';

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private readonly disposable = new CompositeDisposable();
        private menu!: Menu;

        connectedCallback() {
            const pluck = this.firstChild!;
            pluck.remove();
            const placement = this.getAttribute('placement') as MenuPlacement | undefined;
            const parentElement = this.parentElement!;
            this.menu = new Menu(parentElement, {
                content: pluck,
                placement: placement ?? 'auto',
            });
            parentElement.oncontextmenu = this.show;
        }

        disconnectedCallback() { this.disposable!.dispose() }

        show = (e: MouseEvent) => {
            this.menu.show();
        }
    }
    customElements.define('plasticity-menu', Anon);
}