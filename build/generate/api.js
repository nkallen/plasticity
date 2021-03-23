export default {
    classes: {
        Model: {
            initializers: [],
            functions: [
                "MbItem3 * AddItem(MbItem & item, SimpleName n)",
                "bool DetachItem(MbItem * item)",
                "const MbItem * GetItemByName(SimpleName n, MbPath & path, MbMatrix3D & from)"
            ]
        }
    }
}
