const isReturn = { isReturn: true };
const isNullable = { isNullable: true };
const isErrorBool = { isErrorBool: true };
const ignore = { ignore: true };
const isRaw = { isRaw: true };
const isOnHeap = { isOnStack: false };
const isManual = { isManual: true };

export default {
    classes: {
        RefItem: {
            rawHeader: "reference_item.h",
            freeFunctionName: "::DeleteItem",
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
        AttributeContainer: {
            rawHeader: "attribute_container.h",
            dependencies: ["Grid.h"],
            functions: [
                "void SetStyle(int s)",
                "int GetStyle()",
                "void SetColor(uint32 c)",
                "uint32 GetColor()",
                "void AttributesConvert(MbGrid & other)", // NOTE: this is a hack to support face.AttributesConvert(grid)
            ],
        },
        SpaceItem: {
            rawHeader: "space_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h", "RegDuplicate.h", "RegTransform.h", "Matrix3D.h", "Vector3D.h", "Axis3D.h", "Cube.h"],
            functions: [
                "MbeSpaceType IsA()",
                "MbeSpaceType Type()",
                "MbeSpaceType Family()",
                { signature: "MbItem * Cast()", isManual },
                "void Transform(const MbMatrix3D & mat, MbRegTransform * iReg = NULL)",
                "void Move(const MbVector3D & v, MbRegTransform * iReg = NULL)",
                "void Rotate(const MbAxis3D & axis, double angle, MbRegTransform * iReg = NULL )",
                "void Refresh()",
                // { signature: "MbSpaceItem * Duplicate(MbRegDuplicate * iReg = NULL)", isManual },
                { signature: "MbSpaceItem & Duplicate(MbRegDuplicate * iReg = NULL)", return: isOnHeap },
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
            dependencies: ["RefItem.h", "ControlData3D.h", "SpaceItem.h", "SNameMaker.h", "FaceShell.h"],
            functions: [
                "MbeCreatorType IsA()",
                "MbeCreatorType Type()",
                { signature: "MbCreator * Cast()", isManual },
                { signature: "void GetBasisPoints(MbControlData3D & cd)", cd: isReturn },
                "void SetBasisPoints(const MbControlData3D & cd)",
                { signature: "void GetBasisItems(RPArray<MbSpaceItem> & items)", items: isReturn },
                "size_t GetCreatorsCount(MbeCreatorType ct)",
                { signature: "const MbSNameMaker & GetYourNameMaker()", return: isOnHeap },
                "MbeProcessState GetStatus()",
                "void SetStatus(MbeProcessState l)",
                { signature: "bool CreateShell(MbFaceShell *& shell, MbeCopyMode sameShell, RPArray<MbSpaceItem> * items = NULL)", items: isReturn, shell: { isInput: true }, return: { name: "success" } },
                "SimpleName GetMainName()",
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
                { signature: "bool GetCreators(RPArray<MbCreator> & creators)", creators: isReturn, return: isErrorBool },
                "bool DeleteCreator(size_t ind)",
                "size_t GetActiveCreatorsCount()",
            ]
        },
        Model: {
            rawHeader: "model.h",
            dependencies: ["Item.h", "Path.h", "Matrix3D.h", "ModelAddon.h", "Transactions.h", "Axis3D.h"],
            initializers: [""],
            extends: ["RefItem", "AttributeContainer", "Transactions"],
            functions: [
                "MbItem * AddItem(MbItem & item, SimpleName n = c3d::UNDEFINED_SNAME)",
                "size_t ItemsCount()",
                { signature: "void GetItems(RPArray<MbItem> & items)", items: isReturn },
                "bool DetachItem(MbItem * item, bool resetName = true)",
                "void DeleteItem(MbItem * item, bool resetName = true)",
                {
                    signature: "const MbItem * GetItemByName(SimpleName n, MbPath & path, MbMatrix3D & from)",
                    path: isReturn, from: isReturn, return: { name: "item" }
                },
                {
                    signature: "bool NearestMesh(MbeSpaceType sType, MbeTopologyType tType, MbePlaneType pType, const MbAxis3D & axis, double maxDistance, bool gridPriority, MbItem *& find, SimpleName & findName, MbRefItem *& element, SimpleName & elementName, MbPath & path, MbMatrix3D & from)",
                    return: { name: 'success' }, find: isReturn, findName: isReturn, element: isReturn, elementName: isReturn, path: isReturn, from: isReturn,
                },
            ],
        },
        Item: {
            rawHeader: "model_item.h",
            dependencies: ["ProgressIndicator.h", "Mesh.h", "StepData.h", "FormNote.h", "RegDuplicate.h", "AttributeContainer.h", "SpaceItem.h", "Transactions.h", "Creator.h", "ControlData3D.h"],
            extends: ["SpaceItem", "AttributeContainer", "Transactions"],
            functions: [
                "MbItem * CreateMesh(const MbStepData & stepData, const MbFormNote & note, MbRegDuplicate * iReg = NULL)",
                {
                    signature: "void CalculateMesh(const MbStepData & stepData, const MbFormNote & note, MbMesh & mesh)",
                    mesh: isReturn
                },
                "SimpleName GetItemName()",
                "void SetItemName(SimpleName name)",
                { signature: "MbItem * Cast()", isManual },
                { signature: "bool RebuildItem(MbeCopyMode sameShell, RPArray<MbSpaceItem> * items, ProgressIndicator * progInd = NULL)", items: isReturn, return: isErrorBool, progInd: isRaw },
                "const MbItem * GetItemByPath(const MbPath & path, size_t ind, MbMatrix3D & from, size_t currInd = 0)"
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
                { signature: "void ProjectionRect(const MbPlacement3D & place, MbRect & rect)", rect: isReturn },
                "bool Intersect(const MbCube &other, double eps = c3d::MIN_RADIUS)",
            ],
            fields: [
                "MbCartPoint3D pmin",
                "MbCartPoint3D pmax",
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
            dependencies: ["SpaceItem.h", "Placement3D.h", "CartPoint.h", "Rect2D.h"],
            functions: [
                { signature: "MbSurface * Cast()", isManual },
                { signature: "const MbSurface & GetSurface()", return: isOnHeap },
                "double GetUEpsilon()",
                "double GetVEpsilon()",
                "double GetUMid()",
                "double GetVMid()",
                "double GetUMin()",
                "double GetUMax()",
                "double GetVMin()",
                "double GetVMax()",
                "double GetUParamToUnit()",
                "double GetVParamToUnit()",
                "double GetRadius()",
                { signature: "void PointOn(MbCartPoint & uv, MbCartPoint3D & p)", p: isReturn, isUninheritable: true },
                { signature: "void Normal(double &u, double &v, MbVector3D & result)", result: isReturn },
                { signature: "bool GetPlacement(MbPlacement3D * place, bool exact = false)", place: isReturn, return: isErrorBool, isUninheritable: true },
                { signature: "bool NearDirectPointProjection(const MbCartPoint3D & pnt, const MbVector3D & vect, double & u, double & v, bool ext, MbRect2D * uvRange = nullptr, bool onlyPositiveDirection = false)", return: isErrorBool, u: isReturn, v: isReturn }
            ]
        },
        Solid: {
            rawHeader: "solid.h",
            extends: "Item",
            dependencies: ["StepData.h", "FormNote.h", "Item.h", "CurveEdge.h", "Face.h", "FaceShell.h", "Creator.h"],
            initializers: [
                "MbFaceShell * shell, MbCreator * creator",
                "MbFaceShell & shell, const MbSolid & solid, MbCreator * creator = nullptr",
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
                "bool IsClosed()",
                "const MbCube GetCube()",
                "void SetOwnChangedThrough(MbeChangedType type)",
                "void MakeRight()",
                "bool IsRight()",
                "MbeItemLocation SolidClassification(const MbSolid & solid, double epsilon = Math::metricRegion)",
            ]
        },
        Assembly: {
            rawHeader: "assembly.h",
            extends: "Item",
            dependencies: ["Item.h"],
            functions: [
                { signature: "void GetItems(RPArray<MbItem> & items)", items: isReturn },
            ]
        },
        RegTransform: {
            rawHeader: "item_registrator.h"
        },
        PlaneItem: {
            rawHeader: "plane_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h", "RegTransform.h", "Vector.h", "Surface.h", "Matrix.h", "Rect.h"],
            functions: [
                "MbePlaneType IsA()",
                "MbePlaneType Type()",
                "MbePlaneType Family()",
                { signature: "MbPlaneItem * Cast()", isManual },
                { signature: "void Move(const MbVector & to, MbRegTransform * iReg = NULL, const MbSurface * newSurface = NULL)", newSurface: isReturn },
                "void Transform(const MbMatrix & matr, MbRegTransform * iReg = NULL, const MbSurface * newSurface = NULL)",
                { signature: "MbPlaneItem & Duplicate(MbRegDuplicate * dup = NULL)", return: isOnHeap },
                "void AddYourGabaritTo(MbRect & rect)",
            ]
        },
        Curve: {
            rawHeader: "curve.h",
            extends: "PlaneItem",
            dependencies: ["PlaneItem.h"],
            functions: [
                { signature: "MbCurve3D * Cast()", isManual },
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
        PolyCurve: {
            rawHeader: "cur_polycurve.h",
            extends: "Curve",
            dependencies: ["Curve.h", "CartPoint.h"],
            functions: [
                "size_t GetPointsCount()",
                { signature: "void GetPoint(ptrdiff_t index, MbCartPoint & pnt)", pnt: isReturn },
                "void AddPoint(const MbCartPoint & pnt)",
            ]
        },
        Hermit: {
            rawHeader: "cur_hermit.h",
            extends: "PolyCurve",
            dependencies: ["PolyCurve.h"],
        },
        CubicSpline: {
            rawHeader: "cur_cubic_spline.h",
            extends: "PolyCurve",
            dependencies: ["PolyCurve.h"],
        },
        Polyline: {
            rawHeader: "cur_polyline.h",
            extends: "PolyCurve",
            dependencies: ["PolyCurve.h"],
        },
        Contour: {
            rawHeader: "cur_contour.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
            initializers: [
                "const RPArray<MbCurve> & curves, bool sameCurves",
            ],
            functions: [
                "void InitClosed(bool c)",
                "void CheckClosed(double closedEps)",
                "double GetArea(double sag = 1*Math::deviateSag)",
                "size_t GetSegmentsCount()",
                "const MbCurve * GetSegment(size_t i)",
                "bool AddCurveWithRuledCheck(MbCurve & newCur, double absEps, bool toEndOnly = false, bool checkSame = true, VERSION version = Math::DefaultMathVersion())",
                { signature: "void GetCornerParams(SArray<double> & params)", params: isReturn }
            ]
        },
        ContourWithBreaks: {
            rawHeader: "cur_contour_with_breaks.h",
            dependencies: ["Contour.h"],
            extends: "Contour",
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
            dependencies: ["SpaceItem.h", "Placement3D.h", "Curve.h", "_PlanarCheckParams.h", "Rect1D.h", "ControlData3D.h"],
            functions: [
                { signature: "MbItem * Cast()", isManual },
                {
                    signature: "bool GetPlaneCurve(MbCurve *& curve2d, MbPlacement3D & placement, bool saveParams, PlanarCheckParams params = PlanarCheckParams())",
                    placement: isReturn,
                    return: isErrorBool,
                },
                "bool IsPlanar(double accuracy = METRIC_EPSILON)",
                "bool IsClosed()",
                "bool IsTouch()",
                "double GetTMax()",
                "double GetTMin()",
                "double GetPeriod()",
                "bool IsPeriodic()",
                "bool IsStraight(bool ignoreParams = false)",
                "MbCurve3D * Trimmed(double t1, double t2, int sense)",
                // "MbVector3D GetLimitTangent(ptrdiff_t number)",
                { signature: "void Normal(double & t, MbVector3D & n)", n: isReturn },
                { signature: "void Tangent(double & t, MbVector3D & tan)", tan: isReturn },
                { signature: "void BNormal(double & t, MbVector3D & b)", b: isReturn },
                { signature: "void GetCentre(MbCartPoint3D & c)", c: isReturn },
                { signature: "void GetLimitPoint(ptrdiff_t number, MbCartPoint3D & point)", point: isReturn },
                { signature: "void PointOn(double & t, MbCartPoint3D & p)", p: isReturn },
                { signature: "void _PointOn(double & t, MbCartPoint3D & p)", p: isReturn },
                { signature: "bool NearPointProjection(const MbCartPoint3D & pnt, double & t, bool ext, MbRect1D * tRange = NULL)", tRange: isNullable, t: isReturn, return: { name: "success" } },
                { signature: "bool GetSurfaceCurve(MbCurve *& curve2d, MbSurface *& surface, VERSION version = Math::DefaultMathVersion())", return: isErrorBool },
                { signature: "void GetWeightCentre(MbCartPoint3D & point)", point: isReturn },
                { signature: "const MbCurve3D & GetBasisCurve()", return: isOnHeap },
                { signature: "void GetBasisPoints(MbControlData3D & cd)", cd: isReturn },
                "void SetBasisPoints(const MbControlData3D & cd)",
                "void Inverse()",
                "MbCurve * GetProjection(const MbPlacement3D &place, VERSION version = Math::DefaultMathVersion())",
                { signature: "bool GetCircleAxis(MbAxis3D & axis)", axis: isReturn, return: { name: "success" } },
            ]
        },
        Rect2D: {
            rawHeader: "mb_rect2d.h"
        },
        TrimmedCurve3D: {
            rawHeader: "cur_trimmed_curve3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        TrimmedCurve: {
            rawHeader: "cur_trimmed_curve.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
        },
        ReparamCurve3D: {
            rawHeader: "cur_reparam_curve3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        ReparamCurve: {
            rawHeader: "cur_reparam_curve.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
        },
        BridgeCurve3D: {
            rawHeader: "cur_bridge3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        OffsetCurve3D: {
            rawHeader: "cur_offset_curve3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h"],
        },
        OffsetCurve: {
            rawHeader: "cur_offset_curve.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
        },
        SurfaceCurve: {
            rawHeader: "cur_surface_curve.h",
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
            ],
            functions: [
                "const MbPlacement3D & GetPlacement()",
                { signature: "MbItem * Cast()", isManual },
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
                { signature: "void GetSegments(RPArray<MbCurve3D> & segments)", segments: isReturn },
                { signature: "void FindCorner(size_t index, MbCartPoint3D &t)", t: isReturn },
                { signature: "bool GetCornerAngle(size_t index, MbCartPoint3D & origin, MbVector3D & axis, MbVector3D & tau, double & angle, double angleEps = (double)Math::AngleEps)", origin: isReturn, axis: isReturn, tau: isReturn, angle: isReturn, return: isErrorBool },
                "bool Init(const SArray<MbCartPoint3D> & points)",
                { signature: "MbItem * Cast()", isManual },
                "void DeleteSegment(size_t index)",
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
            dependencies: ["TopItem.h", "CurveEdge.h", "EdgeFunction.h", "Function.h", "EdgeFacesIndexes.h", "ShellHistory.h", "RegDuplicate.h", "Function.h", "Curve3D.h"],
            initializers: [""],
            functions: [
                { signature: "void GetBoundaryEdges(RPArray<MbCurveEdge> & edges)", edges: isReturn },
                { signature: "void GetFaces(RPArray<MbFace> & faces)", faces: isReturn },
                { signature: "bool FindFacesIndexByEdges(const SArray<MbEdgeFunction> & init, RPArray<MbFunction> & functions, RPArray<MbCurve3D> & slideways, SArray<MbEdgeFacesIndexes> & indexes)", indexes: isReturn, functions: isReturn, slideways: isReturn, return: isErrorBool },
                // { signature: "bool FindFacesIndexByEdges(const RPArray<MbCurveEdge> & init, SArray<MbEdgeFacesIndexes> &indexes, bool any = false)", indexes: isReturn, return: isErrorBool },
                { signature: "bool FindEdgesByFacesIndex(const SArray<MbEdgeFacesIndexes> & indexes, RPArray<MbFunction> * functions, RPArray<MbCurve3D> * slideways, RPArray<MbCurveEdge> & initCurves, RPArray<MbFunction> & initFunctions, RPArray<MbCurve3D> & initSlideways)", initCurves: isReturn, return: isErrorBool, functions: isReturn, slideways: isReturn },
                "MbFaceShell * Copy(MbeCopyMode sameShell, MbShellHistory * history = NULL, MbRegDuplicate * iReg = NULL)",
                "MbCurveEdge * GetEdge(size_t index)",
                "void SetOwnChangedThrough(MbeChangedType n)",
            ]
        },
        EdgeFacesIndexes: {
            rawHeader: "op_binding_data.h",
            dependencies: [],
            initializers: [""],
            functions: [],
            fields: [
                "size_t edgeIndex",
                "size_t facePIndex",
                "size_t faceMIndex",
                "SimpleName itemName",
            ]
        },
        ShellHistory: {
            rawHeader: "shell_history.h",
            dependencies: ["Face.h", "FaceShell.h"],
            initializers: [""],
            functions: [
                "void InitOrigins(const RPArray<MbFace> & origin)",
                "void SetOrigins(MbFaceShell & shell)",
                "RPArray<MbFace> & SetOriginFaces()",
                "RPArray<MbFace> & SetCopyFaces()",
            ]
        },
        ElementarySolid: {
            rawHeader: "cr_elementary_solid.h",
            extends: "Creator",
            dependencies: ["SNameMaker.h", "CartPoint3D.h", "FaceShell.h", "Creator.h"],
            initializers: [
            ],
            // functions: [
            //     "bool CreateShell(MbFaceShell *& result, MbeCopyMode sameShell)"
            // ]
        },
        SphereSurface: {
            rawHeader: "surf_sphere_surface.h",
            extends: "ElementarySurface",
            dependencies: ["ElementarySurface.h", "CartPoint3D.h"],
            initializers: [
                "const MbCartPoint3D & centre, double r"
            ]
        },
        Instance: {
            rawHeader: "instance.h",
            extends: "Item",
            dependencies: ["Item.h"],
            functions: [
                "const MbItem * GetItem()"
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
            extends: "Curve",
            dependencies: ["Curve.h", "CartPoint.h"],
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
            ],
            functions: [
                "const MbCartPoint & GetPoint1()",
                "const MbCartPoint & GetPoint2()",
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
                "MbVector3D & Invert()",
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
                "const MbCartPoint3D & GetOrigin()",
                "const MbVector3D & GetAxisZ()",
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
                "MbPlacement3D & InitYZ(const MbCartPoint3D &p, const MbVector3D &axisY, const MbVector3D &axisZ)",
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
            ],
            functions: [
                "bool Wire()",
                "bool Grid()",
                "bool Seam()",
                "bool Quad()",
                "bool Fair()",
            ],
        },
        FloatAxis3D: {
            rawHeader: "mesh_float_point3d.h",
            dependencies: ["Axis3D.h"],
            initializers: [
                "const MbAxis3D & initAxis",
                "const MbCartPoint3D &initOrigin, const MbVector3D &initAxisZ",
            ],
        },
        FloatPoint3D: {
            rawHeader: "mesh_float_point3d.h",
            fields: ["float x", "float y", "float z"],
        },
        Mesh: {
            rawHeader: "mesh.h",
            extends: "Item",
            dependencies: ["Item.h", "Grid.h", "FloatAxis3D.h", "FloatPoint3D.h", "Axis3D.h", "Matrix3D.h", "Path.h"],
            initializers: ["bool doExact"],
            functions: [
                { signature: "void GetBuffers(RPArray<MeshBuffer> & result)", isManual, result: isReturn },
                { signature: "Float32Array GetApexes()", isManual },
                { signature: "void GetEdges(bool outlinesOnly = false, RPArray<EdgeBuffer> &result)", isManual, result: isReturn },
                "MbeSpaceType GetMeshType()",
                "void ConvertAllToTriangles()",
                "bool IsClosed()",
                "MbGrid * AddGrid()",
                {
                    signature: "void AddGrid(MbGrid & gr)",
                    jsName: "AddExistingGrid",
                },
                { signature: "void GetGrids(RPArray<MbGrid> & result)", result: isReturn },
                "void CreateGridSearchTrees(bool forcedNew = false)",
                {
                    signature: "bool LineIntersection(const MbFloatAxis3D & line, MbFloatPoint3D & crossPnt, float & tRes)",
                    crossPnt: isReturn, tRes: isReturn,
                },
                {
                    signature: "bool NearestMesh(MbeSpaceType sType, MbeTopologyType tType, MbePlaneType pType, const MbAxis3D & axis, double maxDistance, bool gridPriority, double & t, double & dMin, MbItem *& find, SimpleName & findName, MbRefItem *& element, SimpleName & elementName, MbPath & path, MbMatrix3D & from)",
                    return: { name: 'success' }, t: isReturn, dMin: isReturn, find: isReturn, findName: isReturn, element: isReturn, elementName: isReturn, path: isReturn, from: isReturn,
                },
            ]
        },
        RegDuplicate: {
            rawHeader: "item_registrator.h",
            dependencies: ["RefItem.h"],
            functions: [
                "bool IsReg(const MbRefItem * srcItem, MbRefItem *& cpyItem)",
                "void SetReg(const MbRefItem * srcItem, MbRefItem * cpyItem)",
            ],
        },
        AutoRegDuplicate: {
            rawHeader: "item_registrator.h",
        },
        NameMaker: {
            rawHeader: "name_item.h",
            extends: "RefItem",
            dependencies: ["RefItem.h", "TopologyItem.h"],
            functions: [
                "bool IsChild(const MbTopologyItem & t)",
                "SimpleName GetMainName()",
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
                "MbeStepType t, double sag",
                "",
            ],
            functions: [
                "void SetSag(double s)",
                "void SetAngle(double a)",
                "void SetLength(double l)",
                "void SetMaxCount(size_t c)",
                "double GetSag()",
                "double GetAngle()",
                "double GetLength()",
                "void SetStepType(MbeStepType t, bool add = true)",
                "void Init(MbeStepType t, double s, double a, double l, size_t c = 0)"
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
            rawHeader: "name_item.h",
            functions: [
                "size_t Count()",
            ]
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
        Homogeneous3D: {
            rawHeader: "mb_homogeneous3d.h",
            initializers: [
                "double initX, double initY, double initZ, double initW"
            ]
        },
        Matrix3D: {
            rawHeader: "mb_matrix3d.h",
            dependencies: ["CartPoint3D.h", "Vector3D.h", "Axis3D.h", "Homogeneous3D.h"],
            initializers: [""],
            functions: [
                "void Scale(double sx, double sy, double sz)",
                "MbMatrix3D & Rotate(const MbAxis3D & axis, double angle)",
                "void Symmetry(const MbCartPoint3D & origin, MbVector3D & normal)",
                "MbVector3D GetRow(size_t i)",
                "MbVector3D GetColumn(size_t i)",
                "void SetRow(size_t i, MbHomogeneous3D h)",
                "void SetColumn(size_t i, MbHomogeneous3D h)",
                "const MbVector3D & GetAxisX()",
                "const MbVector3D & GetAxisY()",
                "const MbVector3D & GetAxisZ()",
                "const MbVector3D & GetOrigin()",
                "double El(size_t i, size_t j)",
                { signature: "void GetOffset(MbCartPoint3D & p)", p: isReturn },
                "MbMatrix3D & Div(MbMatrix3D & from)",
                "void Adj()",
                "void SetOffset(const MbCartPoint3D &p)",
            ]
        },
        TopologyItem: {
            rawHeader: "topology_item.h",
            dependencies: ["TopItem.h", "AttributeContainer.h", "Name.h", "Cube.h", "StepData.h", "FormNote.h", "Mesh.h"],
            extends: ["TopItem", "AttributeContainer"],
            functions: [
                "MbeTopologyType IsA()",
                "const MbName & GetName()",
                "SimpleName GetMainName()",
                "SimpleName GetFirstName()",
                "SimpleName GetNameHash()",
                "void AddYourGabaritTo(MbCube & cube)",
                { signature: "MbTopologyItem * Cast()", isManual },
                { signature: "void CalculateMesh(const MbStepData & stepData, const MbFormNote & note, MbMesh & mesh)", mesh: isReturn },
                "bool GetOwnChanged()",
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
                "void Reverse()",
                { signature: "void Tangent(double t, MbVector3D & tan)", tan: isReturn },
                { signature: "void GetBegTangent(MbVector3D & tan)", tan: isReturn },
                { signature: "void GetEndTangent(MbVector3D & tan)", tan: isReturn },
            ]
        },
        SurfaceIntersectionCurve: {
            rawHeader: "cur_surface_intersection.h",
            dependencies: ["Surface.h", "Curve3D.h", "Curve.h", "SurfaceCurve.h"],
            extends: "Curve3D",
            functions: [
                "const MbSurface * GetSurfaceOne()",
                "const MbSurface * GetSurfaceTwo()",
                // "const MbSurface & GetCurveOneSurface()",
                // "const MbSurface & GetCurveTwoSurface()",
                // "const MbSurfaceCurve * GetSCurveOne()",
                // "const MbSurfaceCurve * GetSCurveTwo()",
                "const MbCurve * GetPCurveOne()",
                "const MbCurve * GetPCurveTwo()",
                "const MbSurfaceCurve * GetSCurveOne()",
                "const MbSurfaceCurve * GetSCurveTwo()",
                "const MbCurve3D * GetSpaceCurve()",
                // "const MbCurve3D & GetCurveOne()",
                // "const MbCurve3D & GetCurveTwo()",
                { signature: "const MbSurface & GetCurveOneSurface()", return: isOnHeap },
                { signature: "const MbSurface & GetCurveTwoSurface()", return: isOnHeap },
                { signature: "MbItem * Cast()", isManual },
                // "const MbCurve3D & GetExactCurve(bool saveParams = true)",
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
                { signature: "const MbSurfaceIntersectionCurve & GetIntersectionCurve()", return: isOnHeap },
                "MbFace * GetFacePlus()",
                "MbFace * GetFaceMinus()",
                "bool IsSplit(bool strict = false)",
                "const MbCurve3D * GetSpaceCurve()",
                "MbCurve3D * MakeCurve()",
                "bool IsSmooth()",
                "bool IsSeam()",
                "bool IsPole()",
                { signature: "bool FaceNormal(double t, MbVector3D & n, bool plus)", n: isReturn, return: isErrorBool },
                { signature: "bool VertexNormal(bool begin, MbVector3D & normal)", normal: isReturn, return: isErrorBool },
                { signature: "bool GetProlongEdges(RPArray<MbCurveEdge> & edges)", edges: isReturn },
                // { signature: "void GetConnectedEdges(bool begin, RPArray<MbCurveEdge> & edges, SArray<bool> & orients)", edges: isReturn },
                { signature: "bool FindOrientedEdge(bool orient, const MbFace * face, MbLoop *& findLoop, size_t & index)", face: isReturn, index: isReturn, return: { name: "success" } },
                { signature: "bool FindOrientedEdgePlus(size_t & loopIndex, MbLoop *& findLoop, size_t & index)", index: isReturn, return: { name: "success" }, loopIndex: isReturn },
                { signature: "bool FindOrientedEdgeMinus(size_t & loopIndex, MbLoop *& findLoop, size_t & index)", index: isReturn, return: { name: "success" }, loopIndex: isReturn },
            ]
        },
        ContourOnSurface: {
            rawHeader: "cur_contour_on_surface.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "Surface.h", "Contour.h"],
            initializers: [
                "const MbSurface & surface, const MbContour & contour, bool same = false",
                "const MbSurface & surf, int sense",
            ],
            functions: [
                { signature: "const MbContour & GetContour()", return: isOnHeap },
                { signature: "const MbSurface & GetSurface()", return: isOnHeap },
                "const MbCurve * GetSegment(size_t index)",
                "size_t GetSegmentsCount()"
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
                "const MbPlacement3D & GetPlacement()",
                { signature: "MbItem * Cast()", isManual },
            ]
        },
        OrientedEdge: {
            rawHeader: "topology.h",
            dependencies: ["CurveEdge.h"],
            functions: [
                { signature: "MbCurveEdge & GetCurveEdge()", return: isOnHeap },
            ]
        },
        Loop: {
            rawHeader: "topology.h",
            extends: "TopItem",
            dependencies: ["TopItem.h", "Surface.h", "ContourOnSurface.h", "OrientedEdge.h"],
            functions: [
                { signature: "MbContourOnSurface & MakeContourOnSurface(const MbSurface & surf, bool faceSense, bool doExact=false)", return: isOnHeap },
                "ptrdiff_t GetEdgesCount()",
                "MbOrientedEdge * GetOrientedEdge(size_t index)",
                { signature: "void GetEdges(RPArray<MbCurveEdge> & edges, bool findSame = true)", edges: isReturn },
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
                { signature: "bool GetPlanePlacement(MbPlacement3D & result)", result: isReturn, return: isErrorBool },
                { signature: "bool GetControlPlacement(MbPlacement3D & result)", result: isReturn, return: isErrorBool },
                { signature: "bool GetSurfacePlacement(MbPlacement3D & result)", result: isReturn, return: isErrorBool },
                { signature: "bool OrientPlacement(MbPlacement3D & result)", return: isErrorBool },
                { signature: "MbeItemLocation NearPointProjection(const MbCartPoint3D & point, double & u, double & v, MbVector3D & normal, c3d::IndicesPair & edgeLoc, ptrdiff_t & corner)", u: isReturn, v: isReturn, normal: isReturn, edgeLoc: isReturn, corner: isReturn, return: { name: "location" } },
                { signature: "void GetFaceParam(const double surfaceU, const double surfaceV, double & faceU, double & faceV)", faceU: isReturn, faceV: isReturn },
                { signature: "void GetSurfaceParam(const double faceU, const double faceV, double & surfaceU, double & surfaceV)", surfaceU: isReturn, surfaceV: isReturn },
                { signature: "void GetOuterEdges(RPArray<MbCurveEdge> & edges, size_t mapThreshold = 50)", edges: isReturn },
                { signature: "void GetEdges(RPArray<MbCurveEdge> & edges, size_t mapThreshold = 50)", edges: isReturn },
                // { signature: "void GetEdges(RPArray<MbCurveEdge> & edges, size_t mapThreshold=50)", edges: isReturn },
                "bool IsSame(const MbTopologyItem & other, double accuracy)",
                { signature: "void GetNeighborFaces(RPArray<MbFace> & faces)", faces: isReturn },
                { signature: "void GetBoundaryEdges(RPArray<MbCurveEdge> & edges)", edges: isReturn },
                { signature: "MbSurface * GetSurfaceCurvesData(RPArray<MbContour> & contours)", contours: isReturn, return: { name: "surface" } },
                "bool HasNeighborFace()",
                "size_t GetLoopsCount()",
                { signature: "const MbSurface & GetSurface()", return: isOnHeap },
                "MbLoop * GetLoop(size_t index)",
                "bool IsSameSense()",
                "MbFace * DataDuplicate(MbRegDuplicate * dup = NULL)",
                "bool IsPlanar()",
                { signature: "bool GetCylinderAxis(MbAxis3D & axis)", axis: isReturn, return: isErrorBool },
                "bool UpdateSurfaceBounds(bool curveBoundedOnly = true)",
                "bool IsOwnChangedItem(bool checkVertices = false)",
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
            initializers: [
                "",
                "double d1, double d2, MbeSmoothForm f, double c, bool pro, SmoothValues::CornerForm cor, bool autoS, bool keep, bool str, bool equ"
            ],
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
                "const MbPlacement3D & place, const MbContour & contour, bool sameContour, const MbVector3D & dir, int part, const MbMergingFlags & mergingFlags, bool cutAsClosed, const MbSNameMaker & snMaker",
                "const MbSurface & surface, bool sameSurface, const MbMergingFlags & mergingFlags, bool cutAsClosed, const MbSNameMaker & snMaker",
                "const MbSurface & surface, bool sameSurface, int part, const MbMergingFlags & mergingFlags, bool cutAsClosed, const MbSNameMaker & snMaker",
            ],
            functions: [
                "void SetSurfaceProlongType(MbeSurfaceProlongType pt)",
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
            dependencies: ["CartPoint3D.h", "Curve3D.h", "Placement3D.h", "Arc.h"],
            initializers: [
                "const MbCartPoint3D & p0, const MbCartPoint3D & p1, const MbCartPoint3D & p2, int n, bool closed",
                "const MbCartPoint3D & pc, const MbCartPoint3D & p1, const MbCartPoint3D & p2, int initSense = 0",
                "const MbPlacement3D & place, double aa, double bb, double angle",
                "const MbCartPoint3D & pc, const MbCartPoint3D & p1, const MbCartPoint3D & p2, const MbVector3D & aZ, int initSense",
                "const MbArc &ellipse, const MbPlacement3D &place",
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
                "bool MakeTrimmed(double t1, double t2)",
                "double GetTrim1()",
                "double GetTrim2()",
            ]
        },
        Arc: {
            rawHeader: "cur_arc.h",
            extends: "Curve",
            dependencies: ["Curve.h"],
            initializers: ["double rad"],
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
                "size_t GetCount()",
                { signature: "MbItem * Cast()", isManual },
            ]
        },
        Polyline3D: {
            rawHeader: "cur_polyline3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h", "CartPoint3D.h", "Polyline.h"],
            initializers: [
                "const SArray<MbCartPoint3D> & initList, bool closed",
                "const MbPolyline & polyline, const MbPlacement3D &placement",
            ],
            functions: [
                { signature: "MbItem * Cast()", isManual },
            ]
        },
        Bezier3D: {
            rawHeader: "cur_bezier3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h"],
        },
        Bezier: {
            rawHeader: "cur_bezier.h",
            extends: "PolyCurve",
            dependencies: ["PolyCurve.h"],
        },
        CubicSpline3D: {
            rawHeader: "cur_cubic_spline3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h", "CubicSpline.h"],
            functions: [
                { signature: "MbCubicSpline3D * MbCubicSpline3D::Create(const MbCubicSpline & initFlat, const MbPlacement3D & plane )", isStatic: true },
            ]
        },
        Hermit3D: {
            rawHeader: "cur_hermit3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h"],
        },
        Nurbs3D: {
            rawHeader: "cur_nurbs3d.h",
            extends: "PolyCurve3D",
            dependencies: ["PolyCurve3D.h", "Placement3D.h", "Nurbs.h", "Axis3D.h"],
            functions: [
                { signature: "MbNurbs3D * MbNurbs3D::Create(const MbNurbs & nurbs, const MbPlacement3D & place)", isStatic: true },
            ]
        },
        Nurbs: {
            rawHeader: "cur_nurbs.h",
            extends: "PolyCurve",
            dependencies: ["PolyCurve.h"],
        },
        LineSegment3D: {
            rawHeader: "cur_line_segment3d.h",
            extends: "Curve3D",
            dependencies: ["Curve3D.h", "CartPoint3D.h"],
            initializers: ["MbCartPoint3D p1, MbCartPoint3D p2"],
            functions: [
                { signature: "MbItem * Cast()", isManual },
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
            ],
            functions: [
                "void SetMergingFaces(bool s)",
                "void SetMergingEdges(bool s)",
            ]
        },
        SweptValues: {
            // isPOD: true,
            rawHeader: "op_swept_parameter.h",
            cppClassName: "_SweptValues",
            rawClassName: "SweptValues",
            jsClassName: "SweptValues",
            initializers: [""],
            fields: [
                "double thickness1",
                "double thickness2",
                "bool shellClosed",
            ],
            functions: [
                "bool CheckSelfInt()",
                "void SetCheckSelfInt(bool c)",
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
                "double derFactor1",
                "double derFactor2",
            ]
        },
        EvolutionValues: {
            extends: "SweptValues",
            dependencies: ["_SweptValues.h"],
            cppClassName: "_EvolutionValues",
            rawClassName: "EvolutionValues",
            jsClassName: "EvolutionValues",
            rawHeader: "op_swept_parameter.h",
            initializers: [""],
            functions: [
                "void SetParallel()",
                "void SetKeepingAngle()",
                "void SetOrthogonal()",
            ],
            fields: [
                "double range",
            ]
        },
        SweptSide: {
            isPOD: true,
            rawHeader: "op_swept_parameter.h",
            fields: [
                "MbSweptWay way",
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
        RevolutionValues: {
            rawHeader: "op_swept_parameter.h",
            extends: "SweptValuesAndSides",
            dependencies: ["_SweptValuesAndSides.h"],
            cppClassName: "_RevolutionValues",
            rawClassName: "RevolutionValues",
            jsClassName: "RevolutionValues",
            initializers: [""],
            fields: [
                "int shape",
            ],
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
            dependencies: ["Placement3D.h", "Contour.h", "Curve3D.h", "Contour3D.h"],
            rawHeader: "op_swept_parameter.h",
            initializers: [
                "",
                "const MbPlacement3D & place, MbContour & contour",
                "MbSurface & surface, RPArray<MbContour> & contours",
                "MbCurve3D & curve3d",
                "RPArray<MbContour3D> & contours3d",
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
        TransformationMaker: {
            rawHeader: "cr_displace_creator.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        ExtensionShell: {
            rawHeader: "cr_extension_shell.h",
            extends: "Creator",
            dependencies: ["Creator.h"]
        },
        MpGraph: {
            rawHeader: "contour_graph.h",
            dependencies: ["Curve.h"],
            cppClassName: "Graph",
            rawClassName: "MpGraph",
            jsClassName: "Graph",
            functions: [
                "size_t GetLoopsCount()",
                { signature: "void GetUsedCurves(const RPArray<MbCurve> & curveList, RPArray<MbCurve> & usedCurves)", usedCurves: isReturn }
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
        Primitive: {
            extends: ["RefItem", "AttributeContainer"],
            dependencies: ["RefItem.h", "AttributeContainer.h"],
            rawHeader: "mesh_primitive.h",
            functions: [
                "void SetItem(const MbRefItem * g)",
                "void SetPrimitiveName(SimpleName n)",
                "void SetPrimitiveType(MbeRefType t)",
            ]
        },
        Grid: {
            extends: "Primitive",
            dependencies: ["Primitive.h", "StepData.h", "Cube.h", "FloatPoint3D.h"],
            rawHeader: "mesh_primitive.h",
            functions: [
                "void SetStepData(const MbStepData & stData)",
                "bool IsSearchTreeReady()",
                "bool CreateSearchTree()",
                "void DeleteSearchTree()",
                "const MbCube & GetCube()",
                "const void * CreateGridTopology(bool keepExisting)",
                "bool IsGridTopologyReady()",
                { signature: "void GetBuffers(MeshBuffer & result)", isManual, result: isReturn },
            ]
        },
        Polygon3D: {
            extends: "Primitive",
            dependencies: ["Primitive.h", "StepData.h", "Cube.h"],
            rawHeader: "mesh_primitive.h",
            functions: [
            ]
        },
        ConvConvertorProperty3D: {
            rawHeader: "conv_exchange_settings.h",
            cppClassName: "_ConvConvertorProperty3D",
            rawClassName: "ConvConvertorProperty3D",
            jsClassName: "ConvConvertorProperty3D",
            fields: [
                "bool enableAutostitch",
                "bool joinSimilarFaces",
                "bool addRemovedFacesAsShells",
                "double lengthUnitsFactor",
                "double appUnitsFactor",
                "bool auditEnabled",
            ]
        },
        C3dModelDocument: {
            rawHeader: "conv_model_document.h",
            cppClassName: "_C3dModelDocument",
            rawClassName: "C3dModelDocument",
            jsClassName: "C3dModelDocument",
            initializers: [
                ""
            ]
        },
        C3DPmiToItem: {
            rawHeader: "conv_model_document.h",
            cppClassName: "_C3DPmiToItem",
            rawClassName: "C3DPmiToItem",
            jsClassName: "C3DPmiToItem",
        },
        Multiline: {
            rawHeader: "multiline.h",
            extends: "PlaneItem",
            dependencies: ["PlaneItem.h", "Contour.h", "VertexOfMultilineInfo.h", "MLTipParams.h", "ContourWithBreaks.h"],
            initializers: [
                "",
                "const MbContour & _basisCurve, const StVertexOfMultilineInfo & vertInfo, const SArray<double> & _equidRadii, const StMLTipParams & _begTipParams, const StMLTipParams & _endTipParams, bool _processClosed, bool _isTransparent",
            ],
            functions: [
                "const MbContour * GetBegTipCurve()",
                "const MbContour * GetEndTipCurve()",
                "size_t GetCurvesCount()",
                "const MbContourWithBreaks * GetCurve(size_t i)",
            ]

        },
        VertexOfMultilineInfo: {
            rawHeader: "multiline.h",
            cppClassName: "VertexOfMultilineInfo",
            rawClassName: "StVertexOfMultilineInfo",
            jsClassName: "VertexOfMultilineInfo",
            initializers: [
                "",
            ]
        },
        MLTipParams: {
            rawHeader: "multiline.h",
            cppClassName: "MLTipParams",
            rawClassName: "StMLTipParams",
            jsClassName: "MLTipParams",
            initializers: [
                "",
                "EnMLTipType _tipType, double _tipParam",
            ]
        },
        ShellsIntersectionData: {
            rawHeader: "check_geometry.h",
            functions: [
                "bool IsSolid()",
                "bool IsSurface()",
            ]
        },
        ShellsDistanceData: {
            isPOD: true,
            rawHeader: "topology_faceset.h",
            functions: [
                "double GetMinDistanse()"
            ]
        },
        SpatialOffsetCurveParams: {
            rawHeader: "op_curve_parameter.h",
            dependencies: ["Vector3D.h", "SNameMaker.h"],
            initializers: [
                "const MbVector3D & v, const MbSNameMaker & nm"
            ]
        },
        SurfaceOffsetCurveParams: {
            rawHeader: "op_curve_parameter.h",
            dependencies: ["Face.h", "Axis3D.h", "SNameMaker.h"],
            initializers: [
                "const MbFace & f, const MbAxis3D & a, double d, const MbSNameMaker & nm"
            ]
        },
        DuplicationValues: {
            rawHeader: "op_duplication_parameter.h",
            cppClassName: "_DuplicationValues",
            rawClassName: "DuplicationValues",
            jsClassName: "DuplicationValues",
            dependencies: ["Matrix3D.h"],
            functions: [
                { signature: "void GenerateTransformMatrices(std::vector<MbMatrix3D> & matrices)", matrices: isReturn }
            ]
        },
        DuplicationMeshValues: {
            rawHeader: "op_duplication_parameter.h",
            extends: ["DuplicationValues"],
            dependencies: ["_DuplicationValues.h", "Vector3D.h", "CartPoint3D.h"],
            cppClassName: "_DuplicationMeshValues",
            rawClassName: "DuplicationMeshValues",
            jsClassName: "DuplicationMeshValues",
            initializers: [
                "bool isPolar, const MbVector3D & dir1, const double step1, const uint num1, const MbVector3D &dir2, const double step2, const uint num2, const MbCartPoint3D * center = NULL, bool isAlongAxis = false"
            ]
        },
        ExtensionValues: {
            rawHeader: "op_shell_parameter.h",
            dependencies: ["CartPoint3D.h", "Vector3D.h", "FaceShell.h", "Face.h", "Solid.h"],
            cppClassName: "_ExtensionValues",
            rawClassName: "ExtensionValues",
            jsClassName: "ExtensionValues",
            initializers: [
                "",
                // "ExtensionValues::ExtensionType t, ExtensionValues::ExtensionWay w, ExtensionValues::LateralKind k, const MbCartPoint3D &p, const MbVector3D &dir, double d, bool pro, bool comb, const MbFaceShell *s, const MbItemIndex &fIndex",
            ],
            functions: [
                "void InitByDistance(ExtensionValues::ExtensionType t, ExtensionValues::LateralKind k, const MbVector3D & v, double dist)",
                "void InitByVertex(ExtensionValues::ExtensionType t, ExtensionValues::LateralKind k, const MbCartPoint3D & v)",
                "void InitByShell(ExtensionValues::ExtensionType t, ExtensionValues::LateralKind k, const MbFace * f, const MbSolid * s)"
            ],
            fields: [
                "ExtensionValues::ExtensionType type",
                "ExtensionValues::ExtensionWay way",
                "ExtensionValues::LateralKind kind",
                "MbCartPoint3D point",
                "MbVector3D direction",
                "double distance",
                "bool prolong",
                "bool combine"
            ]
        },
        HoleValues: {
            rawHeader: "op_shell_parameter.h",
            dependencies: ["CartPoint3D.h", "Vector3D.h", "FaceShell.h", "Face.h", "Solid.h", "Surface.h"],
            cppClassName: "_HoleValues",
            rawClassName: "HoleValues",
            jsClassName: "HoleValues",
            fields: [
                "double placeAngle",
                "double azimuthAngle",
            ],
            "functions": [
                "void SetSurface(MbSurface *s)",
                "void SetPhantom(bool s)",
            ]
        },
        SlotValues: {
            rawHeader: "op_shell_parameter.h",
            extends: "HoleValues",
            dependencies: ["_HoleValues.h"],
            cppClassName: "_SlotValues",
            rawClassName: "SlotValues",
            jsClassName: "SlotValues",
            initializers: [""],
            fields: [
                "double length",
                "double width",
                "double depth",
                "double bottomWidth",
                "double bottomDepth",
                "double floorRadius",
                "double tailAngle",
                "SlotValues::SlotType type",
            ]
        },
        SolidDuplicate: {
            rawHeader: "model_item.h",
            cppClassName: "_SolidDuplicate",
            rawClassName: "SolidDuplicate",
            jsClassName: "SolidDuplicate",
            dependencies: ["SolidPool.h", "Solid.h"],
            functions: [
                { signature: "void GetBuffers(SolidDuplicateBuffer & result)", isManual, result: isReturn },
                "MbSolid * GetCopy()"
            ]
        },
        SolidPool: {
            rawHeader: "model_item.h",
            cppClassName: "_SolidPool",
            rawClassName: "SolidPool",
            jsClassName: "SolidPool",
            dependencies: ["Solid.h", "SolidPool.h", "_SolidDuplicate.h"],
            initializers: ["MbSolid & original"],
            functions: [
                "void Alloc(size_t n)",
                "SolidDuplicate * Pop()",
                "size_t Count()",
            ]
        }
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
            dependencies: ["Solid.h", "Matrix3D.h", "ShellsIntersectionData.h", "Face.h", "Cube.h", "ShellsDistanceData.h"],
            functions: [
                {
                    signature: "bool IsSolidsIntersection(const MbSolid & solid1, const MbSolid & solid2, const MbSNameMaker & names)",
                    jsName: "IsSolidsIntersectionFast",
                },
                {
                    signature: "bool IsSolidsIntersection(const MbSolid & solid1, const MbMatrix3D & matr1, const MbSolid & solid2, const MbMatrix3D & matr2, bool checkTangent, bool getIntersectionSolids, bool checkTouchPoints, RPArray<MbShellsIntersectionData> & intData)",
                    intData: isReturn,
                    return: { name: "isIntersection" },
                },
                {
                    signature: "bool MinimumSolidsDistance(const MbSolid & solid1, const MbMatrix3D & matr1, bool isMultipleUseSolid1, const MbSolid & solid2, const MbMatrix3D & matr2, bool isMultipleUseSolid2, double lowerLimitDistance, bool tillFirstLowerLimit, std::vector<MbShellsDistanceData> & shellsDistanceData)",
                    shellsDistanceData: isReturn,
                    return: { name: "hasDistance" },
                },
                // {
                //     signature: "bool FindTouchedFaces(const MbSolid & solid1, const MbSolid & solid2, double precision, c3d::IndicesPairsVector & facesNumbers)",
                //     facesNumbers: isReturn,
                // }
                {
                    signature: "void FindFilletFaces(const RPArray<MbFace> & faces, double accuracy, RPArray<MbFace> & filletFaces)",
                    filletFaces: isReturn,
                },
                // "void GetDistanceToSurface(const MbPlacement3D & pl, const MbCurve * curve, const MbSurface * surf, double & lPlus, double & lMinus)",
                { signature: "bool GetDistanceToCube(const MbPlacement3D & pl, const MbFaceShell * shell, double & dPlus, double & dMinus, bool findMax = true)", dPlus: isReturn, dMinus: isReturn, return: { name: 'isFound' } }
                // { signature: "void GetDistanceToCube(const MbSurface & surface, const MbVector3D & direction, const MbCurve & curve, const MbCube & cube, double & lPlus, double & lMinus, MbResultType & resType)", lPlus: isReturn, lMinus: isReturn, resType: isReturn }
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
            dependencies: ["Contour3D.h", "Curve3D.h", "SurfaceOffsetCurveParams.h", "WireFrame.h", "ElementarySurface.h", "WireFrame.h", "SurfaceOffsetCurveParams.h", "SpatialOffsetCurveParams.h"],
            functions: [
                "MbResultType CreateContourFillets(const MbContour3D & contour, SArray<double> & radiuses, MbCurve3D *& result, const MbeConnectingType type)",
                "MbResultType OffsetPlaneCurve(const MbCurve3D &curve, double dist, MbCurve3D *& result)",
                {
                    signature: "MbResultType OffsetCurve(const MbCurve3D & curve, const MbSurfaceOffsetCurveParams & params, SPtr<MbWireFrame> & result)",
                    jsName: "OffsetSurfaceCurve",
                    result: isReturn
                },
                {
                    signature: "MbResultType OffsetCurve(const MbCurve3D & initCurve, const MbSpatialOffsetCurveParams & params, SPtr<MbWireFrame> & result)",
                    jsName: "OffsetCurve",
                    result: isReturn,
                },
                {
                    signature: "MbResultType FilletCurve(const MbCurve3D & curve1, double & t1, double & w1, const MbCurve3D & curve2, double & t2, double & w2, double & radius, bool sense, bool & unchanged, const MbeConnectingType type, const MbSNameMaker & names, MbElementarySurface *& surface, MbWireFrame *& result)",
                    w1: isReturn,
                    w2: isReturn,
                    unchanged: isReturn,
                },
                "MbResultType BridgeCurve(const MbCurve3D & curve1, double t1, bool sense1, const MbCurve3D & curve2, double t2, bool sense2, const MbSNameMaker & names, MbWireFrame *& result)",
                "MbResultType ConnectingSpline(const MbCurve3D & curve1, double t1, MbeMatingType mating1, const MbCurve3D & curve2, double t2, MbeMatingType mating2, double tension1, double tension2, const MbSNameMaker & names, MbWireFrame *& result)",
                { signature: "MbResultType CurveProjection(const MbSurface & surface, const MbCurve3D & curve, MbVector3D * direction, bool createExact, bool truncateByBounds, RPArray<MbCurve3D> & result, VERSION version = Math::DefaultMathVersion())", direction: isNullable, result: isReturn }
            ]
        },
        ActionSolid: {
            rawHeader: "action_solid.h",
            dependencies: ["CartPoint3D.h", "Surface.h", "SNameMaker.h", "Solid.h", "_SmoothValues.h", "Face.h", "CurveEdge.h", "BooleanFlags.h", "Placement3D.h", "Contour.h", "MergingFlags.h", "_LoftedValues.h", "SweptData.h", "_ExtrusionValues.h", "EdgeFunction.h", "ShellCuttingParams.h", "_SweptValues.h", "_RevolutionValues.h", "_EvolutionValues.h", "_DuplicationValues.h", "_HoleValues.h"],
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
                {
                    signature: "MbResultType SplitSolid(MbSolid & solid, MbeCopyMode sameShell, const RPArray<MbSpaceItem> & spItems, bool spSame, RPArray<MbFace> & selFaces, const MbMergingFlags & flags, const MbSNameMaker & names, MbSolid *& result)",
                    jsName: "SplitSolidBySpaceItem",
                },
                { signature: "size_t DetachParts(MbSolid & solid, RPArray<MbSolid> & parts, bool sort, const MbSNameMaker & names)", parts: isReturn, return: { name: "count" } },
                { signature: "MbResultType LoftedSolid(SArray<MbPlacement3D> & pl, RPArray<MbContour> & c, const MbCurve3D * spine, const LoftedValues & params, SArray<MbCartPoint3D> * ps, const MbSNameMaker & names, RPArray<MbSNameMaker> & ns, MbSolid *& result)", spine: isNullable, ps: isNullable },
                { signature: "MbResultType ExtrusionSolid(const MbSweptData & sweptData, const MbVector3D & direction, const MbSolid * solid1, const MbSolid * solid2, bool checkIntersection, const ExtrusionValues & params, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, MbSolid *& result)", solid1: isNullable, solid2: isNullable },
                "MbResultType ExtrusionResult(MbSolid & solid, MbeCopyMode sameShell, const MbSweptData & sweptData, const MbVector3D & direction, const ExtrusionValues & params, OperationType oType, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, MbSolid *& result)",
                "MbResultType SymmetrySolid(MbSolid & solid, MbeCopyMode sameShell, const MbPlacement3D & place, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType MirrorSolid(const MbSolid & solid, const MbPlacement3D & place, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType ThinSolid(MbSolid & solid, MbeCopyMode sameShell, RPArray<MbFace> & outFaces, RPArray<MbFace> & offFaces, SArray<double> & offDists, SweptValues & params, const MbSNameMaker & names, bool copyFaceAttrs, MbSolid *& result)",
                "MbResultType RevolutionSolid(const MbSweptData & sweptData, const MbAxis3D & axis, const RevolutionValues & params, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, MbSolid *& result)",
                "MbResultType EvolutionSolid(const MbSweptData & sweptData, const MbCurve3D & spine, const EvolutionValues & params, const MbSNameMaker & operNames, const RPArray<MbSNameMaker> & contoursNames, const MbSNameMaker & spineNames, MbSolid *& result)",
                "MbResultType DuplicationSolid(const MbSolid & solid, const DuplicationValues & params, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType HoleSolid(MbSolid * solid, MbeCopyMode sameShell, const MbPlacement3D & place, const HoleValues & params, const MbSNameMaker & names, MbSolid *& result)"
            ]

        },
        ActionPoint: {
            rawHeader: "action_point.h",
            dependencies: ["Line3D.h", "CartPoint3D.h"],
            functions: [
                "double LineLineNearestPoints(const MbLine3D & line1, const MbLine3D & line2, MbCartPoint3D & p1, MbCartPoint3D & p2)",
                {
                    signature: "ptrdiff_t CurveCurveIntersection(const MbCurve & curve1, const MbCurve & curve2, SArray<double> & result1, SArray<double> & result2, double xEpsilon, double yEpsilon, bool touchInclude, bool allowInaccuracy = true)",
                    result1: isReturn, result2: isReturn,
                    jsName: "CurveCurveIntersection2D",
                    return: { name: "count" },
                },
                {
                    signature: "ptrdiff_t CurveCurveIntersection(const MbCurve3D & curve1, const MbCurve3D & curve2, SArray<double> & result1, SArray<double> & result2, double mEps)",
                    result1: isReturn, result2: isReturn,
                    jsName: "CurveCurveIntersection3D",
                    return: { name: "count" },
                },
                {
                    signature: "ptrdiff_t CurveCurveCrossing(const MbCurve3D & curve1, const MbCurve3D & curve2, SArray<double> & result1, SArray<double> & result2, double mEps = Math::metricRegion)",
                    result1: isReturn, result2: isReturn,
                    return: { name: "count" },
                },
            ]
        },
        ActionDirect: {
            rawHeader: "action_direct.h",
            dependencies: ["Solid.h", "_ModifyValues.h", "SNameMaker.h", "_TransformValues.h", "CurveEdge.h"],
            functions: [
                {
                    signature: "MbResultType CollectFacesForModification(MbFaceShell * shell, MbeModifyingType way, double radius, RPArray<MbFace> & faces)",
                    faces: isReturn
                },
                "MbResultType FaceModifiedSolid(MbSolid & solid, MbeCopyMode sameShell, const ModifyValues & params, const RPArray<MbFace> & faces, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType TransformedSolid(MbSolid & solid, MbeCopyMode sameShell, const TransformValues & params, const MbSNameMaker & names, MbSolid *& result)",
                "MbResultType EdgeModifiedSolid(MbSolid & solid, MbeCopyMode sameShell, const ModifyValues & params, const RPArray<MbCurveEdge> & edges, const MbSNameMaker & names, MbSolid *& result)",
            ]
        },
        ActionPhantom: {
            rawHeader: "action_phantom.h",
            dependencies: ["Solid.h", "CurveEdge.h", "_SmoothValues.h", "Surface.h", "EdgeSequence.h", "EdgeFunction.h"],
            functions: [
                {
                    signature: "MbResultType SmoothPhantom(MbSolid & solid, SArray<MbEdgeFunction> & edges, const SmoothValues & params, RPArray<MbSurface> & result)",
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
                "MbResultType SurfaceBoundContour(const MbSurface & surface, const MbCurve3D & spaceCurve, VERSION version = Math::DefaultMathVersion(), MbContour *& result)",
                "MbResultType Line(const MbCartPoint & point1, const MbCartPoint & point2, MbCurve *& result)",
                "MbResultType Segment(const MbCartPoint & point1, const MbCartPoint & point2, MbCurve *& result)",
                "MbResultType RegularPolygon(const MbCartPoint & centre, const MbCartPoint & point, size_t vertexCount, bool describe, MbCurve *& result)",
                "MbResultType NurbsCopy(const MbCurve & curve, MbCurve *& result )",
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
                "MbResultType PlaneCurve(const MbPlacement3D &place, const MbCurve &curve, MbCurve3D *& result)",
                "MbCurve3D * DuplicateCurve(const MbCurve3D & curve, VERSION version = Math::DefaultMathVersion())",
                "MbResultType NurbsCopy(const MbCurve3D & curve, MbCurve3D *& result)",
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
        ActionMesh: {
            rawHeader: "action_mesh.h",
            dependencies: ["FloatPoint3D.h", "Mesh.h"],
            functions: [
                "MbResultType CreateConvexPolyhedron(const SArray<MbFloatPoint3D> & points, MbMesh *& result)"
            ]
        },
        ActionShell: {
            rawHeader: "action_shell.h",
            dependencies: ["Solid.h", "Face.h", "CurveEdge.h", "SNameMaker.h", "_ExtensionValues.h", "_SweptValues.h"],
            functions: [
                "MbResultType ExtensionShell(MbSolid & solid, MbeCopyMode sameShell, MbFace & face, const RPArray<MbCurveEdge> & edges, const ExtensionValues & params, const MbSNameMaker & operNames, MbSolid *& result)",
                "MbResultType OffsetShell(MbSolid & solid, MbeCopyMode sameShell, RPArray<MbFace> & initFaces, bool checkFacesConnection, SweptValues & p, const MbSNameMaker & operNames, bool copyFaceAttrs, MbSolid *& result)"
            ],
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
                "bool RemoveContourGaps(MbContour &	contour, double	accuracy, bool canInsert, bool canReplace)",
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
        CurveTangent: {
            rawHeader: "alg_curve_tangent.h",
            dependencies: ["CartPoint.h", "Curve.h", "Line.h"],
            functions: [
                { signature: "void LinePointTangentCurve(const MbCartPoint & pnt, const MbCurve & pCurve, PArray<MbLine> & pLine, bool lineAsCurve = false)", pLine: isReturn },
                { signature: "void LineTangentTwoCurves(const MbCurve * pCurve1, const MbCurve * pCurve2, PArray<MbLine> * pLine, SArray<MbCartPoint> * secondPoint)", pLine: isReturn, secondPoint: isReturn },
            ]
        },
        CurveUtil: {
            rawHeader: "curve.h",
            dependencies: ["Curve.h"],
            functions: [
                "double AreaSign(const MbCurve & curve, double sag, bool close)",
            ]
        },
        MeshGrid: {
            rawHeader: "mesh_grid.h",
            dependencies: ["Grid.h", "FloatAxis3D.h", "FloatPoint3D.h"],
            functions: [
                { signature: "bool LineGridIntersect(const MbGrid & grid, const MbFloatAxis3D & line, const MbFloatPoint3D & crossPoint, float & tRes)", crossPoint: isReturn, tRes: isReturn, return: { name: "intersected" } }
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
        Registrator: {
            rawHeader: "item_registrator.h",
            dependencies: ["MeshAddon.h", "AutoRegDuplicate.h", "RegDuplicate.h"],
            functions: [
                "void AutoReg(MbAutoRegDuplicate *&autoReg, MbRegDuplicate *&iReg)",
            ],
        },
        TriFace: {
            rawHeader: "tri_face.h",
            dependencies: ["Face.h", "StepData.h", "Grid.h"],
            functions: [
                "void CalculateGrid(const MbFace & face, const MbStepData & stepData, MbGrid & grid, bool dualSeams = true, bool quad = false, bool fair = false)"
            ]
        },
        Conversion: {
            rawHeader: "conv_model_exchange.h",
            dependencies: ["Model.h", "_ConvConvertorProperty3D.h", "ProgressIndicator.h"],
            functions: [
                {
                    signature: "MbeConvResType c3d::ImportFromFile(MbModel & model, const c3d::path_string & fileName, ConvConvertorProperty3D * prop = NULL, ProgressIndicator * indicator = NULL)",
                    indicator: isRaw,
                    model: isReturn,
                    return: { name: "result" }
                },
                {
                    signature: "MbeConvResType c3d::ExportIntoFile(MbModel & model, const c3d::path_string & fileName, ConvConvertorProperty3D * prop = NULL, ProgressIndicator * indicator = NULL)",
                    indicator: isRaw,
                }
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
        "MbeRefType",
        "MbeConvResType",
        "EnMLTipType",
        "MbSweptWay",
        "MbeMatingType",
        "ExtensionValues::ExtensionType",
        "ExtensionValues::ExtensionWay",
        "ExtensionValues::LateralKind",
        "SlotValues::SlotType",
        "MbeChangedType",
    ]
}
