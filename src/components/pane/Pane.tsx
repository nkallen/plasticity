import signals from 'signals';

interface PaneSignals {
    flexScaleChanged: signals.Signal<number>;
}

export class PaneAxis extends HTMLElement {
    signals: PaneSignals = {
        flexScaleChanged: new signals.Signal()
    }

    constructor() {
        super();
        if (!this.style.flexGrow) this.style.flexGrow = '1';
    }

    connectedCallback() {
        // const axis = this.parentElement as PaneAxis;
        // if (axis) {
        //     axis.signals.flexScaleChanged.add((fg) => this.signals.flexScaleChanged.dispatch(fg));
        // }
    }

    set flexGrow(fg: number) {
        this.style.flexGrow = String(fg);
        this.signals.flexScaleChanged.dispatch(fg);
    }

    get flexGrow() {
        return Number(this.style.flexGrow);
    }
}
customElements.define('ispace-pane-axis', PaneAxis);

export class Pane extends HTMLElement {
    signals: PaneSignals = {
        flexScaleChanged: new signals.Signal()
    }

    constructor() {
        super();
        if (!this.style.flexGrow) this.style.flexGrow = '1';
    }

    connectedCallback() {
        const axis = this.closest("ispace-pane-axis")! as PaneAxis;
        axis.signals.flexScaleChanged.add(this.signals.flexScaleChanged.dispatch);
    }

    set flexGrow(fg: number) {
        this.style.flexGrow = String(fg);
        this.signals.flexScaleChanged.dispatch(fg);
    }

    get flexGrow() {
        return Number(this.style.flexGrow);
    }
}
customElements.define('ispace-pane', Pane);

export class PaneResizeHandle extends HTMLElement {
    constructor() {
        super();

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.addEventListener('pointerdown', this.onPointerDown.bind(this));
    }

    onPointerDown(e: PointerEvent) {
        e.stopPropagation();
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerUp(e: PointerEvent) {
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
    }

    onPointerMove(e: PointerEvent) {
        const { clientX, clientY, button } = e;
        if (button != -1) return;
        if (!this.previousSibling && !this.nextSibling) return;
        const previousSibling = this.previousElementSibling as Pane | PaneAxis;
        const nextSibling = this.nextElementSibling as Pane | PaneAxis;

        const direction = this.closest("ispace-pane-axis")!.className;
        if (direction == "horizontal") {
            const totalWidth = previousSibling.clientWidth + nextSibling.clientWidth;

            let leftWidth = clientX - previousSibling.getBoundingClientRect().left;
            leftWidth = Math.min(Math.max(leftWidth, 0), totalWidth);
            const rightWidth = totalWidth - leftWidth;
            setFlexGrow(leftWidth, rightWidth, totalWidth);
        } else {
            const totalHeight = previousSibling.clientHeight + nextSibling.clientHeight;

            let topHeight = clientY - previousSibling.getBoundingClientRect().top;
            topHeight = Math.min(Math.max(topHeight, 0), totalHeight);
            const bottomHeight = totalHeight - topHeight;
            setFlexGrow(topHeight, bottomHeight, totalHeight);
        }

        function setFlexGrow(prevSize: number, nextSize: number, totalSize: number) {
            const totalScale = previousSibling.flexGrow + nextSibling.flexGrow;

            const prevFlexGrow = totalScale * prevSize / totalSize;
            const nextFlexGrow = totalScale * nextSize / totalSize;

            previousSibling.flexGrow = prevFlexGrow;
            nextSibling.flexGrow = nextFlexGrow;
        }
    }
}
customElements.define('ispace-pane-resize-handle', PaneResizeHandle);
