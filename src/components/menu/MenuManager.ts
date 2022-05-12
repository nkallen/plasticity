import { CompositeDisposable } from "event-kit";
import { listen } from '../atom/delegated-listener';

export type MenuPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type MenuTrigger = 'onclick' | 'oncontextmenu';

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

        const delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);

        if (delta.left) offset.left += delta.left;
        else offset.top += delta.top;

        div.style.top = offset.top + 'px';
        div.style.left = offset.left + 'px';
    };

    private getViewportAdjustedDelta(placement: string, pos: MenuOffset, actualWidth: number, actualHeight: number) {
        var delta = { top: 0, left: 0 };

        let viewportPadding = 10;
        let viewportDimensions = document.body.getBoundingClientRect();

        if (/right|left/.test(placement)) {
            var topEdgeOffset = pos.top - viewportPadding;
            var bottomEdgeOffset =
                pos.top + viewportPadding + actualHeight;
            if (topEdgeOffset < viewportDimensions.top) {
                // top overflow
                delta.top = viewportDimensions.top - topEdgeOffset;
            } else if (
                bottomEdgeOffset >
                viewportDimensions.top + viewportDimensions.height
            ) {
                // bottom overflow
                delta.top =
                    viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset;
            }
        } else {
            var leftEdgeOffset = pos.left - viewportPadding;
            var rightEdgeOffset = pos.left + viewportPadding + actualWidth;
            if (leftEdgeOffset < viewportDimensions.left) {
                // left overflow
                delta.left = viewportDimensions.left - leftEdgeOffset;
            } else if (rightEdgeOffset > viewportDimensions.right) {
                // right overflow
                delta.left =
                    viewportDimensions.left + viewportDimensions.width - rightEdgeOffset;
            }
        }

        return delta;
    }

    private leave = () => {
        this.div.remove();
    }

    private keypress = (e: KeyboardEvent) => {
        console.log(e);
        if (e.code === 'Esc') {
            this.leave();
            e.preventDefault();
        }
    }

    hide = () => {
        this.leave();
    }
}

const autoToken = /\s?auto?\s?/i;
