import { CompositeDisposable, Disposable } from 'event-kit';
import { Editor } from '../../editor/Editor';
import { Menu, MenuPlacement, MenuTrigger } from './MenuManager';

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private disposable?: Disposable;
        private menu!: Menu;

        connectedCallback() {
            const pluck = this.firstChild!;
            pluck.remove();
            const placement = this.getAttribute('placement') as MenuPlacement | undefined;
            const trigger = this.getAttribute('trigger') as MenuTrigger | undefined;
            const parentElement = this.parentElement!;
            this.menu = new Menu(parentElement, {
                content: pluck,
                placement: placement ?? 'auto',
            });
            if (trigger === 'onclick') parentElement.onclick = this.show;
            else parentElement.oncontextmenu = this.show;
            pluck.addEventListener('closeMenu', this.close);
        }

        disconnectedCallback() { }

        show = (e: MouseEvent) => {
            this.menu.show();
        }

        close = () => {
            this.menu.hide();
            this.disposable!.dispose();
        }
    }
    customElements.define('plasticity-menu', Anon);
}