import { Editor } from '../Editor';
import { RefCounter } from '../Util';
import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, TopologyItem } from '../VisualModel';
import { ClickStrategy } from './Click';
import { Hoverable, HoverStrategy } from './Hover';

export enum SelectionMode {
    Edge, Face, Solid, Curve
}

export interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: CurveSegment, parentItem: SpaceInstance<Curve3D>): boolean;
    invalidIntersection(): void;
}

export class SelectionManager {
    readonly selectedSolids = new Set<Solid>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<SpaceInstance<Curve3D>>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve]);
    hover?: Hoverable = null;

    private readonly clickStrategy = new ClickStrategy(this);
    private readonly hoverStrategy = new HoverStrategy(this);

    constructor(editor: Editor) {
        this.editor = editor;
        editor.signals.factoryCommitted.add(() => this.deselectAll());
    }

    private onIntersection(intersections: THREE.Intersection[], strategy: SelectionStrategy) {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.mode.has(SelectionMode.Solid)) {
                    if (strategy.solid(object, parentItem as Solid)) return;
                }
                if (strategy.topologicalItem(object, parentItem as Solid)) return;
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (strategy.curve3D(object, parentItem)) return;
            }
        }
    }

    onClick(intersections: THREE.Intersection[]) {
        this.onIntersection(intersections, this.clickStrategy);
    }

    onPointerMove(intersections: THREE.Intersection[]) {
        this.onIntersection(intersections, this.hoverStrategy);
    }

    deselectAll() {
        for (const object of this.selectedEdges) {
            this.selectedEdges.delete(object);
            const model = this.editor.db.lookupTopologyItem(object);
            object.material = this.editor.materials.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedFaces) {
            this.selectedFaces.delete(object);
            const model = this.editor.db.lookupTopologyItem(object);
            object.material = this.editor.materials.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedSolids) {
            this.selectedSolids.delete(object);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        this.selectedChildren.clear();
    }
}
