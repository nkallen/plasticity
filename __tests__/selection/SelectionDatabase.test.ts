import { Selection } from '../../src/selection/SelectionDatabase';
import { signals, db, solid } from './ChangeSelection.test';

describe(Selection, () => {
    let selection: Selection;

    beforeEach(() => {

        const sigs = {
            objectRemovedFromDatabase: signals.objectRemoved,
            objectAdded: signals.objectSelected,
            objectRemoved: signals.objectDeselected,
            selectionChanged: signals.selectionChanged
        };
        selection = new Selection(db, sigs as any);
    });

    test("add & remove solid", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(0);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.removeSolid(solid);
        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);
    });

    test("add solid twice", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);
    });

    test("remove solid twice", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.removeSolid(solid);
        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);

        selection.removeSolid(solid);
        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);
    });

    test("add face twice", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        const face = solid.faces.get(0);

        selection.addFace(face, solid);
        expect(selection.faces.first).toBe(face);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        expect(selection.hasSelectedChildren(solid)).toBe(true);

        selection.addFace(face, solid);
        expect(selection.faces.first).toBe(face);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        expect(selection.hasSelectedChildren(solid)).toBe(true);

        selection.removeFace(face, solid);
        expect(selection.faces.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);

        expect(selection.hasSelectedChildren(solid)).toBe(false);
    });
});
