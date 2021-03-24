export default {
    classes: {
        Model: {
            rawHeader: "model.h",
            dependencies: ["Item.h", "Path.h", "Matrix3D.h"],
            initializers: [],
            functions: [
                "MbItem * AddItem(MbItem & item, SimpleName n)",
                "bool DetachItem(MbItem * item)",
                "const MbItem * GetItemByName(SimpleName n, MbPath & path, MbMatrix3D & from)"
            ]
        },
        AttributeContainer: {
            rawHeader: "attribute_container.h",
            functions: [
                "void SetStyle(int s)",
                "int GetStyle()",
            ]
        },
        Item: {
            rawHeader: "model_item.h",
            // dependencies: ["Solid.h", "Mesh.h", "StepData.h", "FormNote.h", "RegDuplicate.h", "AttributeContainer.h", "Vector3D.h", "RegTransform.h"],
            dependencies: ["AttributeContainer.h"],
            extends: "AttributeContainer",
            functions: [
                "MbeSpaceType IsA()",
                // "MbItem * CreateMesh(const MbStepData & stepData, const MbFormNote & note, MbRegDuplicate * iReg)",
                // "void Move(const MbVector3D & v, MbRegTransform *iReg)",
                "SimpleName GetItemName()",
                // "MbItem * Cast()"
            ]
        },
        Path: {
            rawHeader: "name_item.h"
        },
        Matrix3D: {
            rawHeader: "mb_matrix3d.h"
        },
        BooleanFlags: {
            rawHeader: "op_boolean_flags.h",
            initializers: [],
            functions: [
                "void InitBoolean(bool _closed, bool _allowNonIntersecting)",
                "void SetMergingFaces(bool s)",
                "void SetMergingEdges(bool s)",
            ]
        },
        SpaceItem: {
            rawHeader: "space_item.h"
        },
        Surface: {
            rawHeader: "surface.h"
        },
        RegTransform: {
            rawHeader: "item_registrator.h"
        },
        Curve3D: {
            rawHeader: "curve3d.h"
        },
        Plane: {
            rawHeader: "surf_plane.h",
            extends: "Surface",
            dependencies: ["CartPoint3D.h", "Surface.h"],
            initializers: [
                "const MbCartPoint3D & c0, const MbCartPoint3D & c1, const MbCartPoint3D & c2"
            ]
        },
        CartPoint3D: {
            rawHeader: "mb_cart_point3d.h",
            initializers: [
                "double xx, double yy, double zz"
            ]
        },
        SphereSurface: {
            rawHeader: "surf_sphere_surface.h",
            initializers: [
                "MbCartPoint3D centre, double r"
            ]
        }
    }
}
