const isReturn = { isReturn: true };
const isNullable = { isNullable: true };
const isErrorBool = { isErrorBool: true };
const ignore = { ignore: true };
const isRaw = { isRaw: true };

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
        Function: {
            rawHeader: ["function.h"]
        },
        CubicFunction: {
            rawHeader: ["func_cubic_function.h"],
            dependencies: ["Function.h"],
            extends: "Function",
            initializers: ["double value1, double value2"],
            functions: [
                "bool InsertValue(double t, double newValue)"
            ]
        },
        Model: {
            rawHeader: "model.h",
            dependencies: ["Item.h", "Path.h", "Matrix3D.h", "ModelAddon.h"],
            initializers: [""],
            functions: [
                "MbItem * AddItem(MbItem & item, SimpleName n = c3d::UNDEFINED_SNAME)",
                "size_t ItemsCount()",
                { signature: "void GetItems(RPArray<MbItem> & items)", items: isReturn },
                {
                    signature: "bool DetachItem(MbItem * item)",
                    before: "item->AddRef();"
                },
                {
                    signature: "const MbItem * GetItemByName(SimpleName n, MbPath & path, MbMatrix3D & from)",
                    path: isReturn, from: isReturn,
                    return: { name: "item" }
                },
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
            enum: 'SpaceType',
            dependencies: ["RefItem.h", "RegDuplicate.h", "RegTransform.h", "Matrix3D.h", "Vector3D.h", "Axis3D.h", "Cube.h"],
            functions: [
                "MbeSpaceType IsA()",
                "MbeSpaceType Type()",
                "MbeSpaceType Family()",
                { signature: "MbItem * Cast()", isManual: true },
                "void Transform(const MbMatrix3D & mat, MbRegTransform * iReg = NULL)",
                "void Move(const MbVector3D & v, MbRegTransform * iReg = NULL)",
                "void Rotate(const MbAxis3D & axis, double angle, MbRegTransform * iReg = NULL )",
                "void Refresh()",
                // { signature: "MbSpaceItem * Duplicate(MbRegDuplicate * iReg = NULL)", isManual: true },
                "MbSpaceItem & Duplicate(MbRegDuplicate * iReg = NULL)",
                "void AddYourGabaritTo(MbCube & cube)",
            ]
        },
        ControlData3D: {
            rawHeader: "mb_data.h",
            dependencies: ["CartPoint3D.h"],
            functions: [
                "size_t Count()",
                { signature: "bool GetPoint(size_t i, MbCartPoint3D & p)", return: isErrorBool, p: isReturn },
                "bool SetPoint(size_t i, MbCartPoint3D & p)",
                "size_t TotalCount()",
                "size_t ShareCount()",
                "void ResetIndex()",
            ],
        },
        Creator: {
            rawHeader: "creator.h",
            extends: "RefItem",
            dependencies: ["RefItem.h", "ControlData3D.h", "SpaceItem.h", "SNameMaker.h"],
            enum: 'CreatorType',
            functions: [
                "MbeCreatorType IsA()",
                "MbeCreatorType Type()",
                { signature: "MbCreator * Cast()", isManual: true },
                { signature: "void GetBasisPoints(MbControlData3D & cd)", cd: isReturn },
                "void SetBasisPoints(const MbControlData3D & cd)",
                { signature: "void GetBasisItems(RPArray<MbSpaceItem> & items)", items: isReturn },
                "size_t GetCreatorsCount(MbeCreatorType ct)",
                "const MbSNameMaker & GetYourNameMaker()",
                "MbeProcessState GetStatus()",
                "void SetStatus(MbeProcessState l)",
            ]
        },
        Transactions: {
            rawHeader: "creator_transaction.h",
            dependencies: ["Creator.h", "SpaceItem.h"],
            functions: [
                "size_t GetCreatorsCount()",
                "const MbCreator * GetCreator(size_t ind)",
                "MbCreator * SetCreator(size_t ind)",
                "MbCreator * DetachCreator(size_t ind)",
                "bool AddCreator(const MbCreator * creator, bool addSame = false)",
                { signature: "bool GetCreators(RPArray<MbCreator> & creators)", creators: isReturn },
                "bool DeleteCreator(size_t ind)",
                "size_t GetActiveCreatorsCount()",
            ]
        },
        Item: {
            rawHeader: "model_item.h",
            enum: "SpaceType",
            dependencies: ["ProgressIndicator.h", "Mesh.h", "StepData.h", "FormNote.h", "RegDuplicate.h", "AttributeContainer.h", "SpaceItem.h", "Transactions.h", "Creator.h", "ControlData3D.h"],
            extends: ["SpaceItem", "AttributeContainer", "Transactions"],
            functions: [
                "MbItem * CreateMesh(const MbStepData & stepData, const MbFormNote & note, MbRegDuplicate * iReg = NULL)",
                "SimpleName GetItemName()",
                { signature: "MbItem * Cast()", isManual: true },
                { signature: "bool RebuildItem(MbeCopyMode sameShell, RPArray<MbSpaceItem> * items, ProgressIndicator * progInd = NULL)", items: isReturn, return: isErrorBool, progInd: isRaw },
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
        Rect: {
            rawHeader: "mb_rect.h",
            functions: [
                "double GetTop()",
                "double GetBottom()",
                "double GetLeft()",
                "double GetRight()",
            ]
        },
        Cube: {
            rawHeader: "mb_cube.h",
            dependencies: ["CartPoint3D.h", "Matrix3D.h", "Placement3D.h", "Rect.h"],
            initializers: [
                "",
                "const MbCartPoint3D & p0, const MbCartPoint3D & p1, bool normalize = false"
            ],
            functions: [
                { signature: "bool CalculateMatrix(size_t pIndex, const MbCartPoint3D & point, const MbCartPoint3D & fixedPoint, bool useFixed, bool isotropy, MbMatrix3D & matrix)", matrix: isReturn },
                { signature: "void ProjectionRect(const MbPlacement3D & place, MbRect & rect)", rect: isReturn }
            ]
        },
        BooleanFlags: {
            rawHeader: "op_boolean_flags.h",
            initializers: [""],
            functions: [
                "void InitBoolean(bool _closed, bool _allowNonIntersecting = false)",
                "void InitCutting(bool _closed, bool _allowNonIntersecting = false)",
                "void SetMergingFaces(bool s)",
                "void SetMergingEdges(bool s)",
            ]
        },
        SurfaceOffsetCurveParams: {
            rawHeader: "op_curve_parameter.h",
            dependencies: ["Face.h", "Axis3D.h", "SNameMaker.h"],
            initializers: ["const MbFace & f, const MbAxis3D & a, double d, const MbSNameMaker & nm)"],
        },
        Surface: {
            rawHeader: "surface.h",
            extends: "SpaceItem",
            dependencies: ["SpaceItem.h", "Placement3D.h", "CartPoint.h"],
            functions: [
                { signature: "MbSurface * Cast()", isManual: true },
                "const MbSurface & GetSurface()",
                "double GetUEpsilon()",
                "double GetVEpsilon()",
                "double GetUMid()",
                "double GetVMid()",
                "double GetUMin()",
                "double GetUMax()",
                "double GetVMin()",
                "double GetVMax()",
                "double GetRadius()",
                { signature: "void PointOn(MbCartPoint & uv, MbCartPoint3D & p)", p: isReturn, isUninheritable: true },
                { signature: "void Normal(double &u, double &v, MbVector3D & result)", result: isReturn },
                { signature: "bool GetPlacement(MbPlacement3D * place, bool exact = false)", place: isReturn, return: isErrorBool, isUninheritable: true },
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
                { signature: "void GetEdges(RPArray<MbCurveEdge> & edges)", edges: isReturn },
                { signature: "void GetFaces(RPArray<MbFace> & faces)", faces: isReturn },
                "const MbFace * FindFaceByName(const MbName & name)",
                "const MbFace * FindFaceByHash(const SimpleName h)",
                "const MbFace * GetFace(size_t index)",
                "MbCurveEdge * GetEdge(size_t index)",
                "MbCurveEdge * FindEdgeByName(const MbName & name)",
                "MbFaceShell * GetShell()",
                "size_t GetFaceIndex(const MbFace & face)",
                "size_t GetEdgeIndex(const MbCurveEdge & edge)",
                { signature: "void GetBasisPoints(MbControlData3D & cd)", cd: isReturn },
                "void SetBasisPoints(const MbControlData3D & cd)",
                { signature: "void GetItems(RPArray<MbTopologyItem> items)", items: isReturn },
            ]
        },
        RegTransform: {
            rawHeader: "item_registrator.h"
        },
        PlaneItem: {
            rawHeader: "plane_item.h",
            enum: 'PlaneType',
            extends: "RefItem",
            dependencies: ["RefItem.h", "RegTransform.h", "Vector.h", "Surface.h", "Matrix.h"],
            functions: [
                "MbePlaneType IsA()",
                "MbePlaneType Type()",
                "MbePlaneType Family()",
                { signature: "MbPlaneItem * Cast()", isManual: true },
                { signature: "void Move(const MbVector & to, MbRegTransform * iReg = NULL, const MbSurface * newSurface = NULL)", newSurface: isReturn },
                "void Transform(const MbMatrix & matr, MbRegTransform * iReg = NULL, const MbSurface * newSurface = NULL)",
            ]
        },
        Curve: {
            rawHeader: "curve.h",
            extends: "PlaneItem",
            dependencies: ["PlaneItem.h"],
            functions: [
                "void Inverse(MbRegTransform * iReg = NULL)",
                "MbCurve * Trimmed(double t1, double t2, int sense)",
                "bool IsStraight(bool ignoreParams = false)",
                "bool IsClosed()",
                "bool IsBounded()",
                "double GetTMax()",
                "double GetTMin()",
                "double GetPeriod()",
                { signature: "bool GetWeightCentre(MbCartPoint & point)", point: isReturn, return: isErrorBool },
                { signature: "void GetLimitPoint(ptrdiff_t number, MbCartPoint & point)", point: isReturn },
                { signature: "void PointOn(double &t, MbCartPoint &p)", p: isReturn },
                { signature: "void _PointOn(double &t, MbCartPoint &p)", p: isReturn },
                { signature: "void Explore(double & t, bool ext, MbCartPoint & pnt, MbVector & fir, MbVector * sec, MbVector * thir)", pnt: isReturn, fir: isReturn, sec: isReturn, thir: isReturn },
                { signature: "void FirstDer(double &t, MbVector &v)", v: isReturn },
                { signature: "void _FirstDer(double &t, MbVector &v)", v: isReturn },
                { signature: "void SecondDer(double &t, MbVector &v)", v: isReturn },
                { signature: "void _SecondDer(double &t, MbVector &v)", v: isReturn },
                { signature: "void Tangent(double &t, MbVector &v)", v: isReturn },
                { signature: "void _Tangent(double &t, MbVector &v)", v: isReturn },
                { signature: "void Normal(double &t, MbVector &v)", v: isReturn },
                { signature: "void _Normal(double &t, MbVector &v)", v: isReturn },
                "MbeItemLocation PointRelative(const MbCartPoint &pnt, double eps=Math::LengthEps)",
                "MbeLocation PointLocation(const MbCartPoint &pnt, double eps=Math::LengthEps)"
            ],
        },
        Contour: {
            rawHeader: "cur_contour.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
            initializers: [
                "const RPArray<MbCurve> & curves, bool sameCurves",
            ],
            functions: [
                "double GetArea(double sag = 1*Math::deviateSag)",
                "size_t GetSegmentsCount()",
            ]
        },
        PlanarCheckParams: {
            rawHeader: "mb_data.h",
            cppClassName: "_PlanarCheckParams",
            rawClassName: "PlanarCheckParams",
            jsClassName: "PlanarCheckParams",
            initializers: ["double accuracy"]
        },
        Rect1D: {
            rawHeader: "mb_rect1d.h",
        },
        Curve3D: {
            rawHeader: "curve3d.h",
            extends: "SpaceItem",
            dependencies: ["SpaceItem.h", "Placement3D.h", "Curve.h", "_PlanarCheckParams.h", "Rect1D.h"],
            functions: [
                {
                    signature: "bool GetPlaneCurve(MbCurve *& curve2d, MbPlacement3D & placement, bool saveParams, PlanarCheckParams params = PlanarCheckParams())",
                    placement: isReturn,
                    return: isErrorBool,
                },
                "bool IsPlanar()",
                "bool IsClosed()",
                "bool IsTouch()",
                "double GetTMax()",
                "double GetTMin()",
                "double GetPeriod()",
                "bool IsPeriodic()",
                "bool IsStraight(bool ignoreParams = false)",
                "MbCurve3D * Trimmed(double t1, double t2, int sense)",
                "MbVector3D GetLimitTangent(ptrdiff_t number)",
                { signature: "void Normal(double & t, MbVector3D & n)", n: isReturn },
                { signature: "void Tangent(double & t, MbVector3D & tan)", tan: isReturn },
                { signature: "void BNormal(double & t, MbVector3D & b)", b: isReturn },
                { signature: "void GetCentre(MbCartPoint3D & c)", c: isReturn },
                { signature: "void GetLimitPoint(ptrdiff_t number, MbCartPoint3D & point)", point: isReturn },
                { signature: "void PointOn(double & t, MbCartPoint3D & p)", p: isReturn },
                { signature: "bool NearPointProjection(const MbCartPoint3D & pnt, double & t, bool ext, MbRect1D * tRange = NULL)", tRange: isNullable, t: isReturn, return: { name: "success" } },
                { signature: "bool GetSurfaceCurve(MbCurve *& curve2d, MbSurface *& surface, VERSION version = Math::DefaultMathVersion())", return: isErrorBool },
                { signature: "void GetWeightCentre(MbCartPoint3D & point)", point: isReturn },
            ]
        },
        TrimmedCurve3D: {
            rawHeader: "cur_trimmed_curve3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        Spiral: {
            rawHeader: "cur_spiral.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        ConeSpiral: {
            rawHeader: "cur_cone_spiral.h",
            extends: "Spiral",
            dependencies: ["Spiral.h"],
        },
        CurveSpiral: {
            rawHeader: "cur_curve_spiral.h",
            extends: "Spiral",
            dependencies: ["Spiral.h"],
        },
        PlaneCurve: {
            rawHeader: "cur_plane_curve.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "Placement3D.h"],
            initializers: [
                "const MbPlacement3D & placement, const MbCurve & init, bool same"
            ]
        },
        Contour3D: {
            rawHeader: "cur_contour3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "CartPoint3D.h", "Vector3D.h"],
            initializers: [""],
            functions: [
                { signature: "bool AddCurveWithRuledCheck(MbCurve3D & curve, double absEps = Math::metricPrecision, bool toEndOnly = false, bool checkSame = true, VERSION version = Math::DefaultMathVersion())", return: isErrorBool },
                "size_t GetSegmentsCount()",
                { signature: "void FindCorner(size_t index, MbCartPoint3D &t)", t: isReturn },
                { signature: "bool GetCornerAngle(size_t index, MbCartPoint3D & origin, MbVector3D & axis, MbVector3D & tau, double & angle, double angleEps = (double)Math::AngleEps)", origin: isReturn, axis: isReturn, tau: isReturn, angle: isReturn, return: isErrorBool },
            ]
        },
        Plane: {
            rawHeader: "surf_plane.h",
            extends: "Surface",
            dependencies: ["CartPoint3D.h", "Surface.h"],
            initializers: [
                "const MbCartPoint3D & c0, const MbCartPoint3D & c1, const MbCartPoint3D & c2",
                "const MbPlacement3D & placement, double distance"
            ]
        },
        CartPoint: {
            rawHeader: "mb_cart_point.h",
            initializers: [
                "double xx, double yy"
            ],
            fields: [
                "double x",
                "double y",
            ],
        },
        CartPoint3D: {
            rawHeader: "mb_cart_point3d.h",
            dependencies: ["Vector3D.h"],
            initializers: [
                "double xx, double yy, double zz"
            ],
            fields: [
                "double x",
                "double y",
                "double z"
            ],
            functions: [
                "MbCartPoint3D & Move(const MbVector3D & to)",
            ]
        },
        ElementarySurface: {
            rawHeader: "surf_elementary_surface.h",
            extends: "Surface",
            dependencies: ["Surface.h"]
        },
        TorusSurface: {
            rawHeader: "surf_torus_surface.h",
            dependencies: ["ElementarySurface.h"],
            extends: "ElementarySurface",
            functions: [
                "double GetMajorRadius()",
                "double GetMinorRadius()",
            ]
        },
        FaceShell: {
            rawHeader: "topology_faceset.h",
            extends: "TopItem",
            dependencies: ["TopItem.h"]
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
                // "MbSpaceItem & Duplicate(MbRegDuplicate * iReg = NULL)",
                { signature: "void GetBasisPoints(MbControlData3D & cd)", cd: isReturn },
                "void SetBasisPoints(const MbControlData3D & cd)"
            ]
        },
        PlaneInstance: {
            rawHeader: "plane_instance.h",
            extends: "Item",
            dependencies: ["Item.h", "PlaneItem.h", "Placement3D.h"],
            initializers: [
                "const MbPlaneItem & item, const MbPlacement3D & placement"
            ],
            functions: [
                "const MbPlacement3D & GetPlacement()",
                "size_t PlaneItemsCount()",
                "const MbPlaneItem * GetPlaneItem(size_t ind = 0)",
            ]
        },
        Region: {
            rawHeader: "region.h",
            extends: "PlaneItem",
            dependencies: ["PlaneItem.h", "Contour.h"],
            functions: [
                { signature: "void DetachContours(RPArray<MbContour> & dstContours)", dstContours: isReturn },
                "size_t GetContoursCount()",
                "MbContour * SetContour(size_t k)",
                "const MbContour * GetContour(size_t k)",
                "const MbContour * GetOutContour()",
                "bool SetCorrect()",
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
        Vector: {
            rawHeader: "mb_vector.h",
            initializers: [
                "double xx, double yy"
            ],
            fields: [
                "double x",
                "double y",
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
            ],
            functions: [
                "bool Colinear(const MbVector3D & other, double eps = Math::angleRegion)",
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
        Placement: {
            rawHeader: "mb_placement.h",
            dependencies: ["CartPoint.h", "Vector.h"],
            initializers: ["const MbCartPoint & o, const MbVector & x, const MbVector & y"],
        },
        Placement3D: {
            rawHeader: "mb_placement3d.h",
            dependencies: ["Axis3D.h", "Vector3D.h", "Matrix.h"],
            initializers: [
                "",
                "const MbCartPoint3D & org, const MbVector3D & axisZ, const MbVector3D & axisX, bool l = false",
                "const MbCartPoint3D & org, const MbVector3D & axisZ, bool l = false",
                "const MbPlacement3D & place",
            ],
            functions: [
                "MbPlacement3D & Move(const MbVector3D & to)",
                "MbPlacement3D & Rotate(const MbAxis3D & axis, double angle)",
                "MbPlacement3D & Scale(double sx, double sy, double sz)",
                "void SetAxisX(const MbVector3D & a)",
                "void SetAxisY(const MbVector3D & a)",
                "void SetAxisZ(const MbVector3D & a)",
                "const MbCartPoint3D & GetOrigin()",
                "void SetOrigin(const MbCartPoint3D & o)",
                "const MbVector3D & GetAxisZ()",
                "const MbVector3D & GetAxisY()",
                "const MbVector3D & GetAxisX()",
                "void Normalize()",
                "void Reset()",
                "void Invert()",
                "double GetXEpsilon()",
                "double GetYEpsilon()",
                { signature: "void PointProjection(const MbCartPoint3D &p, double &x, double &y)", x: isReturn, y: isReturn },
                "MbeItemLocation PointRelative(const MbCartPoint3D &pnt, double eps = Math::angleRegion)",
                { signature: "bool GetMatrixToPlace(const MbPlacement3D & p, MbMatrix & matrix, double eps = Math::angleRegion)", matrix: isReturn, return: ignore },
                { signature: "void GetVectorFrom(double x1, double y1, double z1, MbVector3D & v, MbeLocalSystemType3D type = ls_CartesianSystem)", v: isReturn },
                { signature: "void GetPointFrom(double x1, double y1, double z1, MbCartPoint3D & p, MbeLocalSystemType3D type = ls_CartesianSystem)", p: isReturn },
                { signature: "void GetPointInto(MbCartPoint3D & p, MbeLocalSystemType3D type = ls_CartesianSystem)" }
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
            dependencies: ["RefItem.h", "TopologyItem.h"],
            functions: [
                "bool IsChild(const MbTopologyItem & t)",
            ]
        },
        SNameMaker: {
            rawHeader: "name_item.h",
            extends: "NameMaker",
            dependencies: ["NameMaker.h"],
            initializers: [
                "SimpleName _mainName, MbSNameMaker::ESides _sideAdd, SimpleName _buttAdd",
            ],
            functions: [
                "void Add(const SimpleName & ent)"
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
                "SimpleName Hash()",
                "SimpleName GetFirstName()",
                "SimpleName GetMainName()",
            ]
        },
        Path: {
            rawHeader: "name_item.h"
        },
        Matrix: {
            rawHeader: "mb_matrix.h",
            dependencies: ["Placement.h"],
            initializers: ["", "const MbPlacement & place"],
            functions: [
                "void Scale(double s)",
                "void ScaleX(double s)",
                "void ScaleY(double s)",
            ]
        },
        Matrix3D: {
            rawHeader: "mb_matrix3d.h",
            dependencies: ["CartPoint3D.h", "Vector3D.h", "Axis3D.h"],
            initializers: [""],
            functions: [
                "void Scale(double sx, double sy, double sz)",
                "MbMatrix3D & Rotate(const MbAxis3D & axis, double angle)",
                "void Symmetry(const MbCartPoint3D & origin, MbVector3D & normal)",
                "MbVector3D GetRow(size_t i)",
                "MbVector3D GetColumn(size_t i)",
                "const MbVector3D & GetAxisX()",
                "const MbVector3D & GetAxisY()",
                "const MbVector3D & GetAxisZ()",
                "const MbVector3D & GetOrigin()",
                "double El(size_t i, size_t j)",
                { signature: "void GetOffset(MbCartPoint3D & p)", p: isReturn }
            ]
        },
        TopologyItem: {
            rawHeader: "topology_item.h",
            dependencies: ["AttributeContainer.h", "Name.h", "Cube.h"],
            extends: "AttributeContainer",
            functions: [
                "MbeTopologyType IsA()",
                "const MbName & GetName()",
                "SimpleName GetMainName()",
                "SimpleName GetFirstName()",
                "SimpleName GetNameHash()",
                "void AddYourGabaritTo(MbCube & cube)",
                { signature: "MbTopologyItem * Cast()", isManual: true },
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
                "double PointProjection(const MbCartPoint3D & p)",
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
                "const MbSurfaceIntersectionCurve & GetIntersectionCurve()",
                "MbFace * GetFacePlus()",
                "MbFace * GetFaceMinus()",
                "bool IsSplit(bool strict = false)",
                "const MbCurve3D * GetSpaceCurve()",
                "MbCurve3D * MakeCurve()",
            ]
        },
        ContourOnSurface: {
            rawHeader: "cur_contour_on_surface.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "Surface.h", "Contour.h"],
            initializers: [
                "const MbSurface & surface, const MbContour & contour, bool same",
                "const MbSurface & surf, int sense",
            ],
            functions: [
                "const MbContour & GetContour()",
                "const MbSurface & GetSurface()"
            ]
        },
        ContourOnPlane: {
            rawHeader: "cur_contour_on_plane.h",
            extends: "ContourOnSurface",
            dependencies: ["ContourOnSurface.h", "Plane.h"],
            initializers: [
                "const MbPlane & plane, const MbContour & contour, bool same",
                "const MbPlane & plane, int sense",
                "const MbPlane & plane",
            ],
            functions: [
                "const MbPlacement3D & GetPlacement()"
            ]
        },
        OrientedEdge: {
            rawHeader: "topology.h",
            dependencies: ["CurveEdge.h"],
            functions: [
                "MbCurveEdge & GetCurveEdge()",
            ]
        },
        Loop: {
            rawHeader: "topology.h",
            extends: "TopItem",
            dependencies: ["TopItem.h", "Surface.h", "ContourOnSurface.h", "OrientedEdge.h"],
            functions: [
                "MbContourOnSurface & MakeContourOnSurface(const MbSurface & surf, bool faceSense, bool doExact=false)",
                "ptrdiff_t GetEdgesCount()",
                "MbOrientedEdge * GetOrientedEdge(size_t index)",
            ]
        },
        Face: {
            rawHeader: "topology.h",
            extends: "TopologyItem",
            dependencies: ["TopologyItem.h", "Vector3D.h", "Placement3D.h", "Surface.h", "CurveEdge.h", "Loop.h", "Contour.h"],
            functions: [
                { signature: "bool GetAnyPointOn(MbCartPoint3D & point, MbVector3D & normal)", point: isReturn, normal: isReturn, },
                { signature: "void Normal(double u, double v, MbVector3D & result)", result: isReturn },
                { signature: "void Point(double faceU, double faceV, MbCartPoint3D & point)", point: isReturn },
                { signature: "bool GetPlacement(MbPlacement3D * result)", result: isReturn, return: isErrorBool },
                { signature: "bool GetControlPlacement(MbPlacement3D & result)", result: isReturn, return: isErrorBool },
                { signature: "bool GetSurfacePlacement(MbPlacement3D & result)", result: isReturn, return: isErrorBool },
                { signature: "MbeItemLocation NearPointProjection(const MbCartPoint3D & point, double & u, double & v, MbVector3D & normal, c3d::IndicesPair & edgeLoc, ptrdiff_t & corner)", u: isReturn, v: isReturn, normal: isReturn, edgeLoc: isReturn, corner: isReturn, return: { name: "location" } },
                { signature: "void GetFaceParam(const double surfaceU, const double surfaceV, double & faceU, double & faceV)", faceU: isReturn, faceV: isReturn },
                { signature: "void GetSurfaceParam(const double faceU, const double faceV, double & surfaceU, double & surfaceV)", surfaceU: isReturn, surfaceV: isReturn },
                { signature: "void GetOuterEdges(RPArray<MbCurveEdge> & edges, size_t mapThreshold = 50)", edges: isReturn },
                // { signature: "void GetEdges(RPArray<MbCurveEdge> & edges, size_t mapThreshold=50)", edges: isReturn },
                { signature: "void GetNeighborFaces(RPArray<MbFace> & faces)", faces: isReturn },
                { signature: "void GetBoundaryEdges(RPArray<MbCurveEdge> & edges)", edges: isReturn },
                { signature: "MbSurface * GetSurfaceCurvesData(RPArray<MbContour> & contours)", contours: isReturn, return: { name: "surface" } },
                "bool HasNeighborFace()",
                "size_t GetLoopsCount()",
                "const MbSurface & GetSurface()",
                "MbLoop * GetLoop(size_t index)",
                "bool IsSameSense()",
                "MbFace * DataDuplicate(MbRegDuplicate * dup = c3d_null)",
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
            dependencies: ["Matrix3D.h", "CartPoint3D.h", "Axis3D.h", "Matrix3D.h"],
            initializers: [
                "",
                "const MbMatrix3D & m",
                "const MbMatrix3D & m, const MbCartPoint3D & f, bool fix = false, bool iso = false",
                "double sX, double sY, double sZ, const MbCartPoint3D & fP"
            ],
            functions: [
                "void Move(const MbVector3D & to)",
                "void Rotate(const MbAxis3D & axis, double ang)",
                "const MbMatrix3D & GetMatrix()",
                "void SetFixed(bool b)",
                "MbCartPoint3D & SetFixedPoint()"
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
        ShellCuttingParams: {
            rawHeader: "op_shell_parameter.h",
            dependencies: ["Placement3D.h", "Contour.h", "Vector3D.h", "MergingFlags.h", "SNameMaker.h"],
            initializers: [
                "const MbPlacement3D & place, const MbContour & contour, bool sameContour, const MbVector3D & dir, const MbMergingFlags & mergingFlags, bool cutAsClosed, const MbSNameMaker & snMaker",
            ],
            functions: [
                "void AddSurfaceProlongType(MbeSurfaceProlongType pt)"
            ]
        },
        EdgeFunction: {
            rawHeader: "topology_faceset.h",
            dependencies: ["CurveEdge.h", "Function.h"],
            initializers: [
                "const MbCurveEdge *e, const MbFunction *f",
            ],
            functions: [
                "const MbCurveEdge * Edge()",
                "const MbFunction * Function()",
            ]
        },
        FunctionFactory: {
            rawHeader: "function_factory.h",
            dependencies: ["Function.h"],
            initializers: [""],
            functions: [
                "MbFunction * CreateAnalyticalFunction(const c3d::string_t &data, const c3d::string_t &argument, double tmin, double tmax)"
            ],
        },
        CharacterCurve: {
            rawHeader: "cur_character_curve.h",
            dependencies: ["Curve.h", "Function.h"],
            extends: "Curve"
        },
        CharacterCurve3D: {
            rawHeader: "cur_character_curve3d.h",
            dependencies: ["Curve3D.h", "Function.h"],
            extends: "Curve3D",
            initializers: ["MbFunction &x, MbFunction &y, MbFunction &z, MbeLocalSystemType3D cs, const MbPlacement3D &place, double tmin, double tmax"],
        },
        Arc3D: {
            rawHeader: "cur_arc3d.h",
            extends: "Curve3D",
            dependencies: ["CartPoint3D.h", "Curve3D.h", "Placement3D.h"],
            initializers: [
                "const MbCartPoint3D & p0, const MbCartPoint3D & p1, const MbCartPoint3D & p2, int n, bool closed",
                "const MbCartPoint3D & pc, const MbCartPoint3D & p1, const MbCartPoint3D & p2, int initSense = 0",
                "const MbPlacement3D & place, double aa, double bb, double angle",
                "const MbCartPoint3D & pc, const MbCartPoint3D & p1, const MbCartPoint3D & p2, const MbVector3D & aZ, int initSense",
            ],
            functions: [
                "void SetLimitPoint(ptrdiff_t number, const MbCartPoint3D & pnt)",
                "void SetRadius(double r)",
                "void SetRadiusA(double r)",
                "void SetRadiusB(double r)",
                "double GetRadius()",
                "double GetRadiusA()",
                "double GetRadiusB()",
                "double GetAngle()",
                "void SetAngle(double ang)",
            ]
        },
        PolyCurve3D: {
            rawHeader: "cur_polycurve3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "CartPoint3D.h"],
            functions: [
                { signature: "void GetPoints(SArray<MbCartPoint3D> & pnts)", pnts: isReturn },
                "void ChangePoint(ptrdiff_t index, const MbCartPoint3D & pnt)",
                "void RemovePoint(ptrdiff_t index)",
                "void Rebuild()",
            ]
        },
        Polyline3D: {
            rawHeader: "cur_polyline3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h", "CartPoint3D.h"],
            initializers: [
                "const SArray<MbCartPoint3D> & initList, bool closed"
            ]
        },
        Bezier3D: {
            rawHeader: "cur_bezier3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h"],
        },
        CubicSpline3D: {
            rawHeader: "cur_cubic_spline3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h"],
        },
        Hermit3D: {
            rawHeader: "cur_hermit3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h"],
        },
        Nurbs3D: {
            rawHeader: "cur_nurbs3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h"],
        },
        LineSegment3D: {
            rawHeader: "cur_line_segment3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
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
            ],
            functions: [
                "void SetMergingFaces(bool s)",
                "void SetMergingEdges(bool s)",
            ]
        },
        SweptValues: {
            isPOD: true,
            rawHeader: "op_swept_parameter.h",
            cppClassName: "_SweptValues",
            rawClassName: "SweptValues",
            jsClassName: "SweptValues",
            fields: [
                "double thickness1",
                "double thickness2",
                "bool shellClosed",
            ]
        },
        LoftedValues: {
            extends: "SweptValues",
            dependencies: ["_SweptValues.h"],
            cppClassName: "_LoftedValues",
            rawClassName: "LoftedValues",
            jsClassName: "LoftedValues",
            rawHeader: "op_swept_parameter.h",
            initializers: [""],
            fields: [
                "bool closed",
            ]
        },
        SweptSide: {
            isPOD: true,
            rawHeader: "op_swept_parameter.h",
            fields: [
                "double rake",
                "double distance",
                "double scalarValue",
            ]
        },
        SweptValuesAndSides: {
            isPOD: true,
            rawHeader: "op_swept_parameter.h",
            extends: "SweptValues",
            dependencies: ["_SweptValues.h", "SweptSide.h"],
            cppClassName: "_SweptValuesAndSides",
            rawClassName: "SweptValuesAndSides",
            jsClassName: "SweptValuesAndSides",
            fields: [
                "MbSweptSide side1",
                "MbSweptSide side2"
            ]
        },
        ExtrusionValues: {
            isPOD: true,
            rawHeader: "op_swept_parameter.h",
            extends: "SweptValuesAndSides",
            dependencies: ["_SweptValuesAndSides.h"],
            cppClassName: "_ExtrusionValues",
            rawClassName: "ExtrusionValues",
            jsClassName: "ExtrusionValues",
            initializers: ["double scalarValue1, double scalarValue2"]
        },
        SweptData: {
            dependencies: ["Placement3D.h", "Contour.h"],
            rawHeader: "op_swept_parameter.h",
            initializers: [
                "",
                "const MbPlacement3D & place, MbContour & contour",
                "MbSurface & surface, RPArray<MbContour> & contours"
            ]
        },
        RegionBooleanParams: {
            rawHeader: "region.h",
            initializers: ["RegionOperationType type, bool selfTouch = true, bool mergeCrvs = true "]
        },
        ElementarySolid: {
            rawHeader: "cr_elementary_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"],
        },
        SmoothSolid: {
            rawHeader: "cr_smooth_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h", "_SmoothValues.h",],
            functions: [
                { signature: "void GetParameters(SmoothValues & params)", params: isReturn },
                "void SetParameters(const SmoothValues & params)",
            ]
        },
        SimpleCreator: {
            rawHeader: "cr_simple_creator.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        CurveSweptSolid: {
            rawHeader: "cr_swept_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"],
        },
        CurveExtrusionSolid: {
            rawHeader: "cr_extrusion_solid.h",
            extends: "CurveSweptSolid",
            dependencies: ["CurveSweptSolid.h"],
        },
        CurveRevolutionSolid: {
            rawHeader: "cr_revolution_solid.h",
            extends: "CurveSweptSolid",
            dependencies: ["CurveSweptSolid.h"],
        },
        CurveEvolutionSolid: {
            rawHeader: "cr_evolution_solid.h",
            extends: "CurveSweptSolid",
            dependencies: ["CurveSweptSolid.h"],
        },
        CurveLoftedSolid: {
            rawHeader: "cr_lofted_solid.h",
            extends: "CurveSweptSolid",
            dependencies: ["CurveSweptSolid.h"],
        },
        BooleanSolid: {
            rawHeader: "cr_boolean_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"],
        },
        CuttingSolid: {
            rawHeader: "cr_cutting_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"],
        },
        SymmetrySolid: {
            rawHeader: "cr_symmetry_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"],
        },
        HoleSolid: {
            rawHeader: "cr_hole_solid.h",
            extends: "CurveSweptSolid",
            dependencies: ["CurveSweptSolid.h"],
        },
        ChamferSolid: {
            rawHeader: "cr_chamfer_solid.h",
            extends: "SmoothSolid",
            dependencies: ["SmoothSolid.h"],
        },
        FilletSolid: {
            rawHeader: "cr_fillet_solid.h",
            extends: "SmoothSolid",
            dependencies: ["SmoothSolid.h"]
        },
        ShellSolid: {
            rawHeader: "cr_thin_shell_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        DraftSolid: {
            rawHeader: "cr_draft_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        RibSolid: {
            rawHeader: "cr_rib_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        SplitShell: {
            rawHeader: "cr_split_shell.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        NurbsBlockSolid: {
            rawHeader: "cr_nurbs_block_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        FaceModifiedSolid: {
            rawHeader: "cr_modified_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        ModifiedNurbsItem: {
            rawHeader: "cr_modified_nurbs_.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        ShellSolid: {
            rawHeader: "cr_thin_shell_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        // NurbsModification: {
        //     rawHeader: "cr_thin_shell_solid.h",
        //     extends: "Creator",
        //     dependencies: ["Creator.h"]
        // },
        TransformedSolid: {
            rawHeader: "cr_transformed_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        ThinShellCreator: {
            rawHeader: "cr_thin_sheet.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        UnionSolid: {
            rawHeader: "cr_union_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        DetachSolid: {
            rawHeader: "cr_detach_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        DuplicationSolid: {
            rawHeader: "cr_duplication_solid.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        ReverseCreator: {
            rawHeader: "cr_simple_creator.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        MpGraph: {
            rawHeader: "contour_graph.h",
            cppClassName: "Graph",
            rawClassName: "MpGraph",
            jsClassName: "Graph",
            functions: [
                "size_t GetLoopsCount()",
            ]
        },
        CrossPoint: {
            isPOD: true,
            rawHeader: "mb_cross_point.h",
            dependencies: ["CartPoint.h", "Curve.h", "PointOnCurve.h"],
            initializers: ["const MbCartPoint & pnt, const MbPointOnCurve<MbCurve> & pOn1, const MbPointOnCurve<MbCurve> & pOn2"],
            fields: [
                "MbCartPoint p",
                "MbPointOnCurve<MbCurve> on1",
                "MbPointOnCurve<MbCurve> on2",
                "MbeIntersectionType form"
            ],
        },
        PointOnCurve: {
            isPOD: true,
            rawClassName: "MbPointOnCurve<MbCurve>",
            rawHeader: "mb_cross_point.h",
            dependencies: ["Curve.h"],
            initializers: ["double t, const MbCurve * curve"],
            fields: [
                "double t",
                "const MbCurve * curve",
            ],
        },
        WireFrame: {
            rawHeader: "wire_frame.h",
            dependencies: ["Curve3D.h"],
            functions: [
                { signature: "void GetCurves(RPArray<MbCurve3D> curves)", curves: isReturn }
            ]
        },
    },
    modules: {
        Enabler: {
            rawHeader: "tool_enabler.h",
            functions: [
                "void EnableMathModules(const char * name, const char * key)"
            ]
        },
        Action: {
            rawHeader: "action.h",
            dependencies: ["Solid.h"],
            functions: [
                "bool IsSolidsIntersection(const MbSolid & solid1, const MbSolid & solid2, const MbSNameMaker & snMaker)",
            ],
        },
        ActionSurface: {
            rawHeader: "action_surface.h",
            dependencies: ["CartPoint3D.h", "Surface.h", "Curve3D.h", "Vector3D.h"],
            functions: [
                "MbResultType ElementarySurface(const MbCartPoint3D & point0, const MbCartPoint3D & point1, const MbCartPoint3D & point2, MbeSpaceType surfaceType, MbSurface *& result)",
                "MbResultType ExtrusionSurface(const MbCurve3D & curve, const MbVector3D & direction, bool simplify, MbSurface *& result)",
            ]
        },
        ActionSurfaceCurve: {
            rawHeader: "action_surface_curve.h",
            dependencies: ["Contour3D.h", "Curve3D.h", "SurfaceOffsetCurveParams.h", "WireFrame.h"],
            functions: [
                "MbResultType CreateContourFillets(const MbContour3D & contour, SArray<double> & radiuses, MbCurve3D *& result, const MbeConnectingType type)",
                "MbResultType OffsetCurve(const MbCurve3D & curve, const MbFace & face, const MbAxis3D & dirAxis, double dist, const MbSNameMaker & snMaker, MbWireFrame *& result)",
            ]
        },
        ActionSolid: {
            rawHeader: "action_solid.h",
            dependencies: ["CartPoint3D.h", "Surface.h", "SNameMaker.h", "Solid.h", "_SmoothValues.h", "Face.h", "CurveEdge.h", "BooleanFlags.h", "Placement3D.h", "Contour.h", "MergingFlags.h", "_LoftedValues.h", "SweptData.h", "_ExtrusionValues.h", "EdgeFunction.h", "ShellCuttingParams.h"],
            functions: [
                "MbResultType ElementarySolid(const SArray<MbCartPoint3D> & points, ElementaryShellType solidType, const MbSNameMaker & names, MbSolid *& result)",
                // "MbResultType ElementarySolid(const MbSurface & surface, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType FilletSolid(MbSolid & solid, MbeCopyMode sameShell, SArray<MbEdgeFunction> & initCurves, RPArray<MbFace> & initBounds, const SmoothValues & params, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType ChamferSolid(MbSolid & solid, MbeCopyMode sameShell, RPArray<MbCurveEdge> & edges, const SmoothValues & params, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType BooleanResult(MbSolid & solid1, MbeCopyMode sameShell1, MbSolid & solid2, MbeCopyMode sameShell2, OperationType oType, const MbBooleanFlags & flags, const MbSNameMaker & operNames, MbSolid *& result)",
                { signature: "MbResultType UnionResult(MbSolid * solid, MbeCopyMode sameShell, RPArray<MbSolid> & solids, MbeCopyMode sameShells, OperationType oType, bool checkIntersect, const MbMergingFlags & mergeFlags, const MbSNameMaker & names, bool isArray, MbSolid *& result, RPArray<MbSolid> * notGluedSolids = NULL)", notGluedSolids: isReturn },
                "MbResultType DraftSolid(MbSolid & solid, MbeCopyMode sameShell, const MbPlacement3D & neutralPlace, double angle, const RPArray<MbFace> & faces, MbeFacePropagation fp, bool reverse, const MbSNameMaker & names, MbSolid *& result)",
                { signature: "MbResultType SolidCutting(MbSolid & solid, MbeCopyMode sameShell, const MbShellCuttingParams & cuttingParams, RPArray<MbSolid> & results)", results: isReturn },
                { signature: "MbResultType SplitSolid(MbSolid & solid, MbeCopyMode sameShell, const MbPlacement3D & spPlace, MbeSenseValue spType, const RPArray<MbContour> & spContours, bool spSame, RPArray<MbFace> & selFaces, const MbMergingFlags & flags, const MbSNameMaker & names, MbSolid *& result)" },
                { signature: "size_t DetachParts(MbSolid & solid, RPArray<MbSolid> & parts, bool sort, const MbSNameMaker & names)", parts: isReturn, return: { name: "count" } },
                { signature: "MbResultType LoftedSolid(SArray<MbPlacement3D> & pl, RPArray<MbContour> & c, const MbCurve3D * spine, const LoftedValues & params, SArray<MbCartPoint3D> * ps, const MbSNameMaker & names, RPArray<MbSNameMaker> & ns, MbSolid *& result)", spine: isNullable, ps: isNullable },
                { signature: "MbResultType ExtrusionSolid(const MbSweptData & sweptData, const MbVector3D & direction, const MbSolid * solid1, const MbSolid * solid2, bool checkIntersection, const ExtrusionValues & params, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, MbSolid *& result)", solid1: isNullable, solid2: isNullable },
                "MbResultType ExtrusionResult(MbSolid & solid, MbeCopyMode sameShell, const MbSweptData & sweptData, const MbVector3D & direction, const ExtrusionValues & params, OperationType oType, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, MbSolid *& result)",
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
        ActionCurve: {
            rawHeader: "action_curve.h",
            dependencies: ["CartPoint.h", "Curve.h", "Contour.h", "Curve3D.h"],
            functions: [
                "MbResultType Arc(const MbCartPoint & center, const SArray<MbCartPoint> & points, bool curveClosed, double angle, double & a, double & b, MbCurve *& result)",
                "MbResultType SplineCurve(const SArray<MbCartPoint> & points, bool closed, MbePlaneType curveType, MbCurve *& result)",
                // { signature: "MbResultType IntersectContour(MbCurve & newCurve, RPArray<MbCurve> & curves, MbContour *& result)" },
                "MbContour * OffsetContour(const MbContour & cntr, double rad, double xEpsilon, double yEpsilon, bool modifySegments, VERSION version = Math::DefaultMathVersion())",
                "MbResultType SurfaceBoundContour(const MbSurface & surface, const MbCurve3D & spaceCurve, VERSION version = Math::DefaultMathVersion(), MbContour *& result)"
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
                "MbResultType RegularPolygon(const MbCartPoint3D & centre, const MbCartPoint3D & point, const MbVector3D & axisZ, size_t vertexCount, bool describe, MbCurve3D *& result)",
                { signature: "MbResultType SpiralCurve(const MbCartPoint3D & point0, const MbCartPoint3D & point1, const MbCartPoint3D & point2, double radius, double step, double angle, MbCurve * lawCurve, bool spiralAxis, MbCurve3D *& result)", lawCurve: isNullable },
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
                // { signature: "bool CreateBooleanResultRegions(RPArray<MbContour> & contours1, RPArray<MbContour> & contours2, const MbRegionBooleanParams & operParams, RPArray<MbRegion> & regions, MbResultType * resInfo = NULL)", resInfo: isReturn, regions: isReturn, return: isErrorBool }
                { signature: "bool CreateBooleanResultRegions(MbRegion & region1, MbRegion & region2, const MbRegionBooleanParams & operParams, RPArray<MbRegion> & regions, MbResultType * resInfo = NULL)", resInfo: isReturn, regions: isReturn, return: isErrorBool }
            ]
        },
        Mutex: {
            rawHeader: "tool_mutex.h",
            functions: [
                "void EnterParallelRegion()",
                "void ExitParallelRegion()"
            ]
        },
        ContourGraph: {
            rawHeader: "contour_graph.h",
            dependencies: ["Curve.h", "Contour.h", "ProgressIndicator.h", "Graph.h"],
            functions: [
                {
                    signature: "MpGraph * OuterContoursBuilder(const RPArray<MbCurve> & curveList, PArray<MbContour> & contours, double accuracy = METRIC_ACCURACY, bool strict = false, VERSION version = Math::DefaultMathVersion(), ProgressIndicator * progInd = NULL)",
                    contours: isReturn,
                    progInd: isRaw,
                    return: { name: "graph" }
                },
            ]
        },
        CurveEnvelope: {
            rawHeader: "alg_curve_envelope.h",
            dependencies: ["Curve.h", "CrossPoint.h"],
            functions: [
                {
                    signature: "void IntersectWithAll(const MbCurve * selectCurve, LIterator<MbCurve> & fromCurve, SArray<MbCrossPoint> & cross, bool self)",
                    // after: "::SortCrossPoints(selectCurve->GetTMin(), selectCurve, cross, SArray<MbCrossPoint>(), SArray<MbCrossPoint>()); ",
                    cross: isReturn
                },
                { signature: "void SortCrossPoints(double tProj, const MbCurve * selectCurve, SArray<MbCrossPoint> & cross, SArray<MbCrossPoint> & crossLeft, SArray<MbCrossPoint> & crossRight)", crossLeft: isReturn, crossRight: isReturn },
            ]
        },
        CurveUtil: {
            rawHeader: "curve.h",
            dependencies: ["Curve.h"],
            functions: [
                "double AreaSign(const MbCurve & curve, double sag, bool close)",
            ]
        },
        Writer: {
            rawHeader: "model.h",
            dependencies: ["ModelAddon.h", "Model.h"],
            functions: [
                { signature: "size_t WriteItems(const MbModel & model, const char *& memory)", return: { name: "size" } },
                { signature: "void ReadItems(const void * memory, MbModel *& model)", }
            ],
        },
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
        "RegionOperationType",
        "MbResultType",
        "MbeCreatorType",
        "MbeArcCreateWay",
        "MbeLocalSystemType3D",
        "MbeConnectingType",
        "MbePlaneType",
        "MbeItemLocation",
        "MbeLocation",
        "MbeIntersectionType",
        "MbeProcessState",
        "MbeTopologyType",
        "MbeSurfaceProlongType",
        "MbeSenseValue",
    ]
}
