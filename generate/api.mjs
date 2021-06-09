const isReturn = { isReturn: true };
const isNullable = { isNullable: true };
const isErrorBool = { isErrorBool: true };

export default {
    classes: {
        RefItem: {
            rawHeader: "reference_item.h",
            freeFunctionName: "DeleteItem",
            protectedDestructor: true,
            functions: [
                "refcount_t GetUseCount()",
                "void AddRef()",
            ]
        },
        Model: {
            rawHeader: "model.h",
            dependencies: ["Item.h", "Path.h", "Matrix3D.h"],
            initializers: [""],
            functions: [
                "MbItem * AddItem(MbItem & item, SimpleName n = c3d::UNDEFINED_SNAME)",
                {
                    signature: "bool DetachItem(MbItem * item)",
                    before: "item->AddRef();"
                },
                {
                    signature: "const MbItem * GetItemByName(SimpleName n, MbPath & path, MbMatrix3D & from)",
                    path: isReturn, from: isReturn,
                    return: { name: "item" }
                }
            ],
        },
        AttributeContainer: {
            rawHeader: "attribute_container.h",
            functions: [
                "void SetStyle(int s)",
                "int GetStyle()",
            ],
        },
        SpaceItem: {
            rawHeader: "space_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h", "RegDuplicate.h", "RegTransform.h", "Matrix3D.h", "Vector3D.h", "Axis3D.h"],
            functions: [
                "MbeSpaceType IsA()",
                { signature: "MbItem * Cast()", isManual: true },
                "void Transform(const MbMatrix3D & mat, MbRegTransform * iReg = NULL)",
                "void Move(const MbVector3D & v, MbRegTransform * iReg = NULL)",
                "void Rotate(const MbAxis3D & axis, double angle, MbRegTransform * iReg = NULL )",
            ]
        },
        Item: {
            rawHeader: "model_item.h",
            dependencies: ["Mesh.h", "StepData.h", "FormNote.h", "RegDuplicate.h", "AttributeContainer.h", "SpaceItem.h"],
            extends: ["SpaceItem", "AttributeContainer"],
            functions: [
                "MbItem * CreateMesh(const MbStepData & stepData, const MbFormNote & note, MbRegDuplicate * iReg = NULL)",
                "SimpleName GetItemName()",
                { signature: "MbItem * Cast()", isManual: true },
            ],
        },
        TopItem: {
            rawHeader: "topology_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h"]
        },
        Path: {
            rawHeader: "name_item.h"
        },
        Cube: {
            rawHeader: "mb_cube.h",
            dependencies: ["CartPoint3D.h", "Matrix3D.h"],
            initializers: [
                "const MbCartPoint3D & p0, const MbCartPoint3D & p1, bool normalize = false"
            ],
            functions: [
                {
                    signature: "bool CalculateMatrix(size_t pIndex, const MbCartPoint3D & point, const MbCartPoint3D & fixedPoint, bool useFixed, bool isotropy, MbMatrix3D & matrix)",
                    matrix: isReturn
                }
            ]
        },
        BooleanFlags: {
            rawHeader: "op_boolean_flags.h",
            initializers: [""],
            functions: [
                "void InitBoolean(bool _closed, bool _allowNonIntersecting = false)",
                "void SetMergingFaces(bool s)",
                "void SetMergingEdges(bool s)",
            ]
        },
        Surface: {
            rawHeader: "surface.h",
            extends: "SpaceItem",
            dependencies: ["SpaceItem.h"],
            functions: [
                // "const MbSurface & GetSurface()"
            ]
        },
        Solid: {
            rawHeader: "solid.h",
            extends: "Item",
            dependencies: ["StepData.h", "FormNote.h", "Item.h", "CurveEdge.h", "Face.h", "FaceShell.h", "Creator.h"],
            initializers: [
                "MbFaceShell * shell, MbCreator * creator"
            ],
            functions: [
                {
                    signature: "void GetEdges(RPArray<MbCurveEdge> & edges)",
                    edges: isReturn
                },
                {
                    signature: "void GetFaces(RPArray<MbFace> & faces)",
                    faces: isReturn
                },
                "const MbFace * FindFaceByName(const MbName & name)",
                "MbCurveEdge * FindEdgeByName(const MbName & name)",
                "MbFaceShell * GetShell()",
            ]
        },
        RegTransform: {
            rawHeader: "item_registrator.h"
        },
        PlaneItem: {
            rawHeader: "plane_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h"]
        },
        Curve: {
            rawHeader: "curve.h",
            extends: "PlaneItem",
            dependencies: ["PlaneItem.h"],
        },
        Contour: {
            rawHeader: "cur_contour.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
            initializers: [
                "const RPArray<MbCurve> & curves, bool sameCurves"
            ]
        },
        Curve3D: {
            rawHeader: "curve3d.h",
            extends: "SpaceItem",
            dependencies: ["SpaceItem.h", "Placement3D.h", "Curve.h"],
            functions: [
                {
                    signature: "bool GetPlaneCurve(MbCurve *& curve2d, MbPlacement3D & placement, bool saveParams, VERSION version = Math::DefaultMathVersion())",
                    placement: isReturn,
                    return: isErrorBool,
                },
                "bool IsClosed()",
                "bool IsTouch()",
                "double GetTMax()",
                "double GetTMin()",
                "double GetPeriod()",
                "double IsPeriodic()",
                { signature: "void PointOn(double & t, MbCartPoint3D & p)", p: isReturn }
            ]
        },
        Contour3D: {
            rawHeader: "cur_contour3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
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
            ],
            fields: [
                "double x",
                "double y",
                "double z"
            ]
        },
        ElementarySurface: {
            rawHeader: "surf_elementary_surface.h",
            extends: "Surface",
            dependencies: ["Surface.h"]
        },
        FaceShell: {
            rawHeader: "topology_faceset.h",
            extends: "TopItem",
            dependencies: ["TopItem.h"]
        },
        Creator: {
            rawHeader: "creator.h",
            extends: "RefItem",
            dependencies: ["RefItem.h"]
        },
        ElementarySolid: {
            rawHeader: "cr_elementary_solid.h",
            extends: "Creator",
            dependencies: ["SNameMaker.h", "CartPoint3D.h", "FaceShell.h", "Creator.h"],
            initializers: [
            ],
            functions: [
                "bool CreateShell(MbFaceShell *& result, MbeCopyMode sameShell)"
            ]
        },
        SphereSurface: {
            rawHeader: "surf_sphere_surface.h",
            extends: "ElementarySurface",
            dependencies: ["ElementarySurface.h", "CartPoint3D.h"],
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
            ],
            functions: [
                "const MbSpaceItem * GetSpaceItem()",
                {
                    signature: "MbSpaceItem * Duplicate(MbRegDuplicate * iReg = NULL)",
                    isManual: true,
                }
            ]
        },
        PlaneInstance: {
            rawHeader: "plane_instance.h",
            extends: "Item",
            dependencies: ["Item.h", "PlaneItem.h", "Placement3D.h"],
            initializers: [
                "const MbPlaneItem & item, const MbPlacement3D & placement"
            ],
        },
        Region: {
            rawHeader: "region.h",
            extends: "PlaneItem",
            dependencies: ["PlaneItem.h"]
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
            extends: "Curve",
            dependencies: ["Curve.h", "CartPoint.h"],
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
            ],
            fields: [
                "double x",
                "double y",
                "double z"
            ]
        },
        Axis3D: {
            rawHeader: "mb_axis3d.h",
            dependencies: ["Placement3D.h", "CartPoint3D.h"],
            initializers: [
                "const MbAxis3D & axis",
                "const MbVector3D & v",
                "const MbCartPoint3D & pnt0, const MbVector3D & dir",
            ],
            functions: [
                "void Rotate(const MbAxis3D & axis, double angle)",
                "void Move(const MbVector3D & to)",
            ]
        },
        Placement3D: {
            rawHeader: "mb_placement3d.h",
            dependencies: ["Axis3D.h", "Vector3D.h"],
            initializers: [""],
            functions: [
                "MbPlacement3D & Move(const MbVector3D & to)",
                "MbPlacement3D & Rotate(const MbAxis3D & axis, double angle)",
                "MbPlacement3D & Scale(double sx, double sy, double sz)",
                "void SetAxisX(const MbVector3D & a)",
                "void SetAxisY(const MbVector3D & a)",
                "void SetAxisZ(const MbVector3D & a)",
                "const MbCartPoint3D & GetOrigin()",
                "const MbVector3D & GetAxisZ()",
                "const MbVector3D & GetAxisY()",
                "const MbVector3D & GetAxisX()",
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
            extends: "Item",
            dependencies: ["Item.h"],
            functions: [
                { signature: "void GetBuffers(RPArray<MeshBuffer> & result)", isManual: true, result: isReturn },
                { signature: "Float32Array GetApexes()", isManual: true },
                { signature: "void GetEdges(bool outlinesOnly = false, RPArray<EdgeBuffer> &result)", isManual: true, result: isReturn },
                "MbeSpaceType GetMeshType()",
                "bool IsClosed()",
            ]
        },
        RegDuplicate: {
            rawHeader: "item_registrator.h"
        },
        NameMaker: {
            rawHeader: "name_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h"]
        },
        SNameMaker: {
            rawHeader: "name_item.h",
            extends: "NameMaker",
            dependencies: ["NameMaker.h"],
            initializers: [
                "SimpleName _mainName, MbSNameMaker::ESides _sideAdd, SimpleName _buttAdd"
            ]
        },
        StepData: {
            rawHeader: "mb_data.h",
            initializers: [
                "MbeStepType t, double sag"
            ]
        },
        Name: {
            rawHeader: "name_item.h",
            functions: [
                "SimpleName Hash()"
            ]
        },
        Path: {
            rawHeader: "name_item.h"
        },
        Matrix3D: {
            rawHeader: "mb_matrix3d.h",
            dependencies: ["CartPoint3D.h", "Vector3D.h"],
            initializers: [""],
            functions: [
                "void Scale(double sx, double sy, double sz)",
                "void Symmetry(const MbCartPoint3D & origin, MbVector3D & normal)"
            ]
        },
        TopologyItem: {
            rawHeader: "topology_item.h",
            dependencies: ["AttributeContainer.h", "Name.h"],
            extends: "AttributeContainer",
            functions: [
                "const MbName & GetName()",
                "SimpleName GetMainName()",
                "SimpleName GetFirstName()",
                "SimpleName GetNameHash()",

            ]
        },
        Edge: {
            rawHeader: "topology.h",
            extends: "TopologyItem",
            dependencies: ["TopologyItem.h", "CartPoint3D.h"],
            functions: [
                { signature: "void Point(double t, MbCartPoint3D &p)", p: isReturn },
                { signature: "void GetBegPoint(MbCartPoint3D & p)", p: isReturn },
                { signature: "void GetEndPoint(MbCartPoint3D & p)", p: isReturn },
            ]
        },
        SurfaceIntersectionCurve: {
            rawHeader: "cur_surface_intersection.h",
            dependencies: ["Surface.h", "Curve3D.h"],
            extends: "Curve3D",
            functions: [
                "const MbSurface * GetSurfaceOne()",
                "const MbSurface * GetSurfaceTwo()",
                // "const MbSurface & GetCurveOneSurface()",
                // "const MbSurface & GetCurveTwoSurface()",
            ]
        },
        CurveEdge: {
            rawHeader: "topology.h",
            extends: "Edge",
            dependencies: ["Edge.h", "Vector3D.h", "SurfaceIntersectionCurve.h", "Face.h"],
            functions: [
                {
                    signature: "bool EdgeNormal(double t, MbVector3D & p)",
                    p: isReturn,
                    return: isErrorBool
                },
                // "const MbSurfaceIntersectionCurve & GetIntersectionCurve()",
                "MbFace * GetFacePlus()",
                "MbFace * GetFaceMinus()",
            ]
        },
        Face: {
            rawHeader: "topology.h",
            extends: "TopologyItem",
            dependencies: ["TopologyItem.h", "Vector3D.h", "Placement3D.h", "Surface.h"],
            functions: [
                {
                    signature: "bool GetAnyPointOn(MbCartPoint3D & point, MbVector3D & normal)",
                    point: isReturn,
                    normal: isReturn,
                },
                {
                    signature: "void Normal(double u, double v, MbVector3D & result)",
                    result: isReturn
                },
                {
                    signature: "void Point(double faceU, double faceV, MbCartPoint3D & point)",
                    point: isReturn
                },
                {
                    signature: "bool GetPlacement(MbPlacement3D * result)",
                    result: isReturn,
                    return: isErrorBool
                },
                {
                    signature: "bool GetControlPlacement(MbPlacement3D & result)",
                    result: isReturn,
                    return: isErrorBool
                },
                {
                    signature: "bool GetSurfacePlacement(MbPlacement3D & result)",
                    result: isReturn,
                    return: isErrorBool
                },
                { signature: "MbeSpaceType IsA()", isManual: true }
            ]
        },
        Vertex: {
            rawHeader: "topology.h",
            extends: "TopologyItem",
            dependencies: ["TopologyItem.h"]
        },
        ModifyValues: {
            cppClassName: "_ModifyValues",
            rawClassName: "ModifyValues",
            jsClassName: "ModifyValues",
            rawHeader: "op_shell_parameter.h",
            dependencies: ["Vector3D.h"],
            initializers: [""],
            fields: [
                "MbeModifyingType way",
                "MbVector3D direction"
            ]
        },
        TransformValues: {
            cppClassName: "_TransformValues",
            rawClassName: "TransformValues",
            jsClassName: "TransformValues",
            rawHeader: "op_shell_parameter.h",
            dependencies: ["Matrix3D.h", "CartPoint3D.h"],
            initializers: [
                "",
                "const MbMatrix3D & m",
                "const MbMatrix3D & m, const MbCartPoint3D & f, bool fix = false, bool iso = false",
                "double sX, double sY, double sZ, const MbCartPoint3D & fP"
            ]
        },
        SmoothValues: {
            cppClassName: "_SmoothValues",
            rawClassName: "SmoothValues",
            jsClassName: "SmoothValues",
            rawHeader: "op_shell_parameter.h",
            dependencies: ["Vector3D.h"],
            initializers: [""],
            fields: [
                "double distance1",
                "double distance2",
                "double conic",
                "double begLength",
                "double endLength",
                "MbeSmoothForm form",
                "SmoothValues::CornerForm smoothCorner",
                "bool prolong",
                "ThreeStates keepCant",
                "bool strict",
                "bool equable",
            ]
        },
        Arc3D: {
            rawHeader: "cur_arc3d.h",
            extends: "Curve3D",
            dependencies: ["CartPoint3D.h", "Curve3D.h"],
            initializers: [
                "const MbCartPoint3D & p0, const MbCartPoint3D & p1, const MbCartPoint3D & p2, int n, bool closed"
            ]
        },
        PolyCurve3D: {
            rawHeader: "cur_polycurve3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        Polyline3D: {
            rawHeader: "cur_polyline3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h", "CartPoint3D.h"],
            initializers: [
                "const SArray<MbCartPoint3D> & initList, bool closed"
            ]
        },
        PointFrame: {
            rawHeader: "point_frame.h",
            extends: "Item",
            dependencies: ["Item.h", "CartPoint3D.h"],
            initializers: [""],
            functions: [
                "void AddVertex(const MbCartPoint3D & point)",
            ]
        },
        EdgeSequence: {
            rawHeader: "position_data.h",
            dependencies: ["CurveEdge.h"],
            freeFunctionName: "DeleteMatItem",
            fields: [
                // "RPArray<const MbCurveEdge> edges",
                "bool closed"
            ]
        },
        MergingFlags: {
            rawHeader: "op_boolean_flags.h",
            initializers: [
                "",
                "bool mergeFaces, bool mergeEdges"
            ]
        },
        LoftedValues: {
            cppClassName: "_LoftedValues",
            rawClassName: "LoftedValues",
            jsClassName: "LoftedValues",
            rawHeader: "op_swept_parameter.h",
            initializers: [""]
        },
        ExtrusionValues: {
            cppClassName: "_ExtrusionValues",
            rawClassName: "ExtrusionValues",
            jsClassName: "ExtrusionValues",
            rawHeader: "op_swept_parameter.h",
            initializers: ["double scalarValue1, double scalarValue2"]
        },
        SweptData: {
            dependencies: ["Placement3D.h", "Contour.h"],
            rawHeader: "op_swept_parameter.h",
            initializers: ["", "const MbPlacement3D &place, MbContour &contour"]
        },
        RegionBooleanParams: {
            rawHeader: "region.h"
        }
    },
    modules: {
        Enabler: {
            rawHeader: "tool_enabler.h",
            functions: [
                "void EnableMathModules(const char * name, const char * key)"
            ]
        },
        ActionSurface: {
            rawHeader: "action_surface.h",
            dependencies: ["CartPoint3D.h", "Surface.h"],
            functions: [
                "MbResultType ElementarySurface(const MbCartPoint3D & point0, const MbCartPoint3D & point1, const MbCartPoint3D & point2, MbeSpaceType surfaceType, MbSurface *& result)"
            ]
        },
        ActionSolid: {
            rawHeader: "action_solid.h",
            dependencies: ["CartPoint3D.h", "Surface.h", "SNameMaker.h", "Solid.h", "_SmoothValues.h", "Face.h", "CurveEdge.h", "BooleanFlags.h", "Placement3D.h", "Contour.h", "MergingFlags.h", "_LoftedValues.h", "SweptData.h", "_ExtrusionValues.h"],
            functions: [
                "MbResultType ElementarySolid(const SArray<MbCartPoint3D> & points, ElementaryShellType solidType, const MbSNameMaker & names, MbSolid *& result)",
                // "MbResultType ElementarySolid(const MbSurface & surface, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType FilletSolid(MbSolid & solid, MbeCopyMode sameShell, RPArray<MbCurveEdge> & initCurves, RPArray<MbFace> & initBounds, const SmoothValues & params, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType BooleanResult(MbSolid & solid1, MbeCopyMode sameShell1, MbSolid & solid2, MbeCopyMode sameShell2, OperationType oType, const MbBooleanFlags & flags, const MbSNameMaker & operNames, MbSolid *& result)",
                "MbResultType DraftSolid(MbSolid & solid, MbeCopyMode sameShell, const MbPlacement3D & neutralPlace, double angle, const RPArray<MbFace> & faces, MbeFacePropagation fp, bool reverse, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType SolidCutting(MbSolid & solid, MbeCopyMode sameShell, const MbPlacement3D & place, const MbContour & contour, const MbVector3D & direction, int retainedPart, const MbSNameMaker & names, bool closed, const MbMergingFlags & flags, MbSolid *& result)",
                {
                    signature: "MbResultType LoftedSolid(SArray<MbPlacement3D> & pl, RPArray<MbContour> & c, const MbCurve3D * spine, const LoftedValues & params, SArray<MbCartPoint3D> * ps, const MbSNameMaker & names, RPArray<MbSNameMaker> & ns, MbSolid *& result)",
                    spine: isNullable,
                    ps: isNullable
                },
                {
                    signature: "MbResultType ExtrusionSolid(const MbSweptData & sweptData, const MbVector3D & direction, const MbSolid * solid1, const MbSolid * solid2, bool checkIntersection, const ExtrusionValues & params, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, MbSolid *& result)",
                    solid1: isNullable,
                    solid2: isNullable
                }
            ]

        },
        ActionPoint: {
            rawHeader: "action_point.h",
            dependencies: ["Line3D.h", "CartPoint3D.h"],
            functions: [
                "double LineLineNearestPoints(const MbLine3D & line1, const MbLine3D & line2, MbCartPoint3D & p1, MbCartPoint3D & p2)",
            ]
        },
        ActionDirect: {
            rawHeader: "action_direct.h",
            dependencies: ["Solid.h", "_ModifyValues.h", "SNameMaker.h", "_TransformValues.h"],
            functions: [
                {
                    signature: "MbResultType CollectFacesForModification(MbFaceShell * shell, MbeModifyingType way, double radius, RPArray<MbFace> & faces)",
                    faces: isReturn
                },
                "MbResultType FaceModifiedSolid(MbSolid & solid, MbeCopyMode sameShell, const ModifyValues & params, const RPArray<MbFace> & faces, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType TransformedSolid(MbSolid & solid, MbeCopyMode sameShell, const TransformValues & params, const MbSNameMaker & names, MbSolid *& result)",
            ]
        },
        ActionPhantom: {
            rawHeader: "action_phantom.h",
            dependencies: ["Solid.h", "CurveEdge.h", "_SmoothValues.h", "Surface.h", "EdgeSequence.h"],
            functions: [
                {
                    signature: "MbResultType SmoothPhantom(MbSolid & solid, RPArray<MbCurveEdge> & initCurves, const SmoothValues & params, RPArray<MbSurface> & result)",
                    result: isReturn
                },
                {
                    signature: "MbResultType SmoothSequence(const MbSolid & solid, RPArray<MbCurveEdge> & edges, const SmoothValues & params, bool createSurfaces, RPArray<MbEdgeSequence> & sequences, RPArray<MbSurface> & result)",
                    sequences: isReturn,
                    result: isReturn,
                }
            ]
        },
        ActionCurve3D: {
            rawHeader: "action_curve3d.h",
            dependencies: ["CartPoint3D.h", "Curve3D.h", "Contour3D.h"],
            functions: [
                // FIXME: technically a & b are inout, but that's not supported yet
                "MbResultType Arc(const MbCartPoint3D & centre, const SArray<MbCartPoint3D> & points, bool curveClosed, double angle, double & a, double & b, MbCurve3D *& result)",
                "MbResultType Segment(const MbCartPoint3D & point1, const MbCartPoint3D & point2, MbCurve3D *& result)",
                "MbResultType SplineCurve(const SArray<MbCartPoint3D> & points, bool closed, MbeSpaceType curveType, MbCurve3D *& result)",
                "MbResultType CreateContour(MbCurve3D & curve, MbContour3D *& result)",
                "MbResultType AddCurveToContour(MbCurve3D & curve, MbCurve3D & contour, bool toEnd)",
                { signature: "MbResultType CreateContours(RPArray<MbCurve3D> & curves, double metricEps, RPArray<MbContour3D> & result, bool onlySmoothConnected = false, VERSION version = Math::DefaultMathVersion())", result: isReturn },
                // "MbResultType RegularPolygon(const MbCartPoint3D & centre, const MbCartPoint3D & point, const MbVector3D & axisZ, size_t vertexCount, bool describe, MbCurve3D *& result )",
            ]
        },
        ActionRegion: {
            rawHeader: "region.h",
            dependencies: ["Region.h", "Contour.h", "RegionBooleanParams.h"],
            functions: [
                { signature: "void GetCorrectRegions(const RPArray<MbContour> & contours, bool sameContours, RPArray<MbRegion> & regions)", regions: isReturn },
                { signature: "void MakeRegions(RPArray<MbContour> & contours, bool useSelfIntCntrs, bool sameContours, RPArray<MbRegion> & regions)", regions: isReturn },
                // "bool CreateBooleanResultRegions(RPArray<MbContour> & contours1, RPArray<MbContour> & contours2, const MbRegionBooleanParams & operParams, RPArray<MbRegion> & regions, MbResultType * resInfo = NULL)"
            ]
        }
    },
    enums: [
        "SimpleName",
        "MbeSpaceType",
        "MbeStepType",
        "MbeModifyingType",
        "MbeCopyMode",
        "MbeSmoothForm",
        "MbSNameMaker::ESides",
        "SmoothValues::CornerForm",
        "ThreeStates",
        "ElementaryShellType",
        "OperationType",
        "MbeFacePropagation",
    ]
}
