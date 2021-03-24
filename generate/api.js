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
            dependencies: ["Solid.h", "Mesh.h", "StepData.h", "FormNote.h", "RegDuplicate.h", "AttributeContainer.h", "Vector3D.h", "RegTransform.h"],
            extends: "AttributeContainer",
            functions: [
                "MbeSpaceType IsA()",
                // "MbItem * CreateMesh(const MbStepData & stepData, const MbFormNote & note, MbRegDuplicate * iReg)",
                "void Move(const MbVector3D & v, MbRegTransform *iReg)",
                "SimpleName GetItemName()",
                { signature: "MbItem * Cast()", isManual: true },
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
        CartPoint: {
            rawHeader: "mb_cart_point.h",
            initializers: [
                "double xx, double yy"
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
            dependencies: ["CartPoint3D.h"],
            initializers: [
                "const MbCartPoint3D & centre, double r"
            ]
        },
        SpaceInstance: {
            rawHeader: "space_instance.h",
            extends: "Item",
            dependencies: ["Item.h", "Surface.h", "Curve3D.h"],
            initializers: [
                "MbSurface & surf",
                "MbCurve3D & curve"
            ]
        },
        Direction: {
            rawHeader: "mb_vector.h",
            initializers: [
                "double a"
            ]
        },
        Line: {
            rawHeader: "cur_line.h",
            dependencies: ["CartPoint.h"],
            initializers: [
                "const MbCartPoint & p1, const MbCartPoint & p2"
            ]
        },
        LineSegment: {
            rawHeader: "cur_line_segment.h",
            dependencies: ["CartPoint.h"],
            initializers: [
                "const MbCartPoint & p1, const MbCartPoint & p2"
            ]
        },
        Line3D: {
            rawHeader: "cur_line3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "CartPoint3D.h"],
            initializers: [
                "const MbCartPoint3D & p1, const MbCartPoint3D & p2"
            ]
        },
        Vector3D: {
            rawHeader: "mb_vector3d.h",
            dependencies: ["CartPoint3D.h"],
            initializers: [
                "double a, double b, double c",
                "const MbCartPoint3D & p1, const MbCartPoint3D & p2"
            ]
        },
        Axis3D: {
            rawHeader: "mb_axis3d.h",
            dependencies: ["Placement3D.h"],
            initializers: [
                "const MbAxis3D & axis",
                "const MbVector3D & v",
            ],
            functions: [
                "void Rotate(const MbAxis3D & axis, double angle)",
                "void Move(const MbVector3D & to)",
            ]
        },
        Placement3D: {
            rawHeader: "mb_placement3d.h",
            dependencies: ["Axis3D.h", "Vector3D.h"],
            initializers: [""],// FIXME check for empty initis,
            functions: [
                "MbPlacement3D & Move(const MbVector3D & to)",
                "MbPlacement3D & Rotate(const MbAxis3D & axis, double angle)",
                "MbPlacement3D & Scale(double sx, double sy, double sz)",
                "void SetAxisX(const MbVector3D & a)",
                "void SetAxisY(const MbVector3D & a)",
                "void SetAxisZ(const MbVector3D & a)",
            ]
        },
        FormNote: {
            rawHeader: "mb_data.h",
            initializers: [
                "bool wire, bool grid, bool seam, bool exact, bool quad"
            ]
        },
        Mesh: {
            rawHeader: "mesh.h",
            functions: [
                { signature: "void GetBuffers()", isManual: true },
                { signature: "void GetApexes()", isManual: true },
                { signature: "void GetEdges()", isManual: true },
                "MbeSpaceType GetMeshType()",
                "bool IsClosed()",
            ]
        },
        RegDuplicate: {
            rawHeader: "item_registrator.h"
        },
        SNameMaker: {
            rawHeader: "name_item.h",
            initializers: [
                "SimpleName _mainName, ESides _sideAdd, SimpleName _buttAdd"
            ]
        },
        StepData: {
            rawHeader: "mb_data.h",
            initializers: [
                
            ]
        }
    }
}
