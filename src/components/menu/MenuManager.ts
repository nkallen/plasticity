import { CompositeDisposable } from "event-kit";
import { listen } from '../atom/delegated-listener';

export type MenuPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface MenuOptions {
    content: Node;
    placement: MenuPlacement;
}

type MenuOffset = {
    top: number;
    left: number;
};

export class Menu {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    private readonly div = document.createElement('div');

    constructor(private readonly target: HTMLElement, private readonly options: MenuOptions) {
        const { div } = this;
        div.appendChild(options.content);
        div.setAttribute('class', 'plasticity-menu');
        this.disposable.add(
            listen(
                div,
                'mouseleave',
                undefined,
                this.leave
            )
        );
    }

    show() {
        const { target, options: { placement }, div } = this;
        const pos = target.getBoundingClientRect();

        document.body.appendChild(div);
        const actualWidth = div.offsetWidth;
        const actualHeight = div.offsetHeight;

        const calculatedOffset = this.calculateOffset(
            placement,
            pos,
            actualWidth,
            actualHeight
        );

        this.applyPlacement(calculatedOffset, placement);
    }

    private calculateOffset(placement: MenuPlacement, pos: DOMRect, actualWidth: number, actualHeight: number): MenuOffset {
        {
            return placement === 'bottom'
                ? {
                    top: pos.top + pos.height,
                    left: pos.left + pos.width / 2 - actualWidth / 2
                }
                : placement === 'top'
                    ? {
                        top: pos.top - actualHeight,
                        left: pos.left + pos.width / 2 - actualWidth / 2
                    }
                    : placement === 'left'
                        ? {
                            top: pos.top + pos.height / 2 - actualHeight / 2,
                            left: pos.left - actualWidth
                        }
                        : /* placement === 'right' */ {
                            top: pos.top + pos.height / 2 - actualHeight / 2,
                            left: pos.left + pos.width
                        };
        }
    }

    private applyPlacement(offset: MenuOffset, placement: MenuPlacement) {
        const { div } = this;

        const width = div.offsetWidth;
        const height = div.offsetHeight;

        // manually read margins because getBoundingClientRect includes difference
        const computedStyle = window.getComputedStyle(div);
        const marginTop = parseInt(computedStyle.marginTop, 10);
        const marginLeft = parseInt(computedStyle.marginLeft, 10);

        offset.top += marginTop;
        offset.left += marginLeft;

        div.style.top = offset.top + 'px';
        div.style.left = offset.left + 'px';

        div.classList.add('in');

        // check to see if placing div in new offset caused the div to resize itself
        const actualWidth = div.offsetWidth;
        const actualHeight = div.offsetHeight;

        if (placement === 'top' && actualHeight !== height) {
            offset.top = offset.top + height - actualHeight;
        }

        const delta = { left: 0, top: 0 };

        if (delta.left) offset.left += delta.left;
        else offset.top += delta.top;

        div.style.top = offset.top + 'px';
        div.style.left = offset.left + 'px';
    };

    private leave = () => {
        this.div.remove();
    }
}

const autoToken = /\s?auto?\s?/i;
