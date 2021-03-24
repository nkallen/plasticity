export default {
    classes: {
        Model: {
            rawHeader: "model.h",
            dependencies: ["Item.h", "Path.h", "Matrix3D.h"],
            initializers: [],
            functions: [
                "MbItem3 * AddItem(MbItem & item, SimpleName n)",
                "bool DetachItem(MbItem * item)",
                "const MbItem * GetItemByName(SimpleName n, MbPath & path, MbMatrix3D & from)"
            ]
        },
        AttributeContainer: {
            rawHeader: "attribute_container.h",
            functions: [
                "void SetStyle(int)",
                "int GetStyle()",
            ]
        },
        Item: {
            rawHeader: "model_item.h",
            // dependencies: ["Solid.h", "Mesh.h", "StepData.h", "FormNote.h", "RegDuplicate.h", "AttributeContainer.h", "Vector3D.h", "RegTransform.h"],
            dependencies: ["AttributeContainer.h"],
            extends: "AttributeContainer",
            functions: [
                // "MbeSpaceType IsA()",
                // "MbItem * CreateMesh(const MbStepData & stepData, const MbFormNote & note, MbRegDuplicate * iReg)",
                // "void Move(const MbVector3D & v, MbRegTransform *iReg)",
                // "SimpleName GetItemName()",
                // "MbItem * Cast()"
            ]
        },
        Path: {
            rawHeader: "name_item.h"
        },
        Matrix3D: {
            rawHeader: "mb_matrix3d.h"
        }
    }
}
