import c3d from '../../build/Release/c3d.node';

export enum ESides {
    SideNone = 0,
    SidePlus = 1,
    SideMinus = -1
}

export enum StepType {
    SpaceStep = 0x01, ///< \ru Шаг по стрелке прогиба. \en Step by sag. 
    DeviationStep = 0x02, ///< \ru Шаг по углу отклонения. \en Step by the deflection angle.  
    MetricStep = 0x04, ///< \ru Шаг по длине. \en Step by length.
    ParamStep = 0x08, ///< \ru Шаг с привязкой объектов к параметрам поверхности. \en Step with binding of objects to the parameters of surface. 
    CollisionStep = 0x10, ///< \ru Шаг для определения столкновений элементов модели. \en Step for collision detection of model elements. 
    MipStep = 0x20,
}

enum ElementaryShellType {
    Sphere = 0, ///< \ru Шар (3 точки). \en Sphere (3 points).
    Torus = 1, ///< \ru Тор (3 точки). \en Torus (3 points).
    Cylinder = 2, ///< \ru Цилиндр (3 точки). \en Cylinder (3 points).
    Cone = 3, ///< \ru Конус (3 точки). \en Cone (3 points).
    Block = 4, ///< \ru Блок (4 точки). \en Block (4 points).
    Wedge = 5, ///< \ru Клин (4 точки). \en Wedge (4 points).
    Prism = 6, ///< \ru Призма (n + 1 точек, n > 2). \en Prism (n + 1 points, n > 2).
    Pyramid = 7, ///< \ru Пирамида (n + 1 точек, n > 2). \en Pyramid (n + 1 points, n > 2).
    Plate = 8, ///< \ru Плита (4 точки). \en Plate (4 points).
    Icosahedron = 9, ///< \ru Икосаэдр (3 точки). \en Icosahedron (3 points).
    Polyhedron = 10, ///< \ru Многогранник (3 точки). \en Polyhedron (3 points).
    Tetrapipe = 11, ///< \ru Тетратруба (3 точки). \en Tetrapipe (3 points).
    Octapipe = 12, ///< \ru Октатруба (3 точки). \en Octapipe (3 points).
}

export enum SpaceType {
    Undefined = 0,  ///< \ru Неизвестный объект. \en Unknown object.
    SpaceItem = 1,  ///< \ru Геометрический объект. \en Geometric object. \n 

    // \ru Типы точек. \en Point types. 
    Point3D = 101,  ///< \ru Точка. \en Point.
    FreePoint3D = 200,  ///< \ru Тип для точек, созданных пользователем. \en Type for the user-defined points. \n 

    // \ru Типы кривых. \en Curve types. 
    Curve3D = 201,  ///< \ru Кривая. \en Curve.
    Line3D = 202,  ///< \ru Прямая. \en Line.
    LineSegment3D = 203,  ///< \ru Отрезок прямой. \en Line segment.
    Arc3D = 204,  ///< \ru Окружность, эллипс, дуга. \en Circle, ellipse, arc.
    Spiral = 205,  ///< \ru Спираль. \en Spiral.
    ConeSpiral = 206,  ///< \ru Коническая спираль. \en Conical spiral.
    CurveSpiral = 207,  ///< \ru Спираль по образующей кривой. \en Spiral curve constructed by generatrix.
    CrookedSpiral = 208,  ///< \ru Спираль по направляющей кривой. \en Spiral along the guide curve.
    PolyCurve3D = 209,  ///< \ru Кривая, построенная по точкам. \en Curve constructed by points.
    Polyline3D = 210,  ///< \ru Полилиния. \en Polyline.
    Nurbs3D = 211,  ///< \ru NURBS кривая. \en NURBS curve.
    Bezier3D = 212,  ///< \ru Кривая Безье. \en Bezier curve.
    Hermit3D = 213,  ///< \ru Составной кубический сплайн Эрмита. \en Composite Hermit cubic spline.
    CubicSpline3D = 214,  ///< \ru Кубический сплайн. \en Cubic spline.
    PlaneCurve = 215,  ///< \ru Плоская кривая в пространстве. \en Plane curve in space.
    OffsetCurve3D = 216,  ///< \ru Эквидистантная кривая. \en Offset curve.
    TrimmedCurve3D = 217,  ///< \ru Усеченная кривая. \en Truncated curve.
    ReparamCurve3D = 218,  ///< \ru Репараметризованная кривая. \en Reparametrized curve.
    BridgeCurve3D = 219,  ///< \ru Кривая-мостик, соединяющая две кривые. \en Curve as a bridge connecting two curves.
    CharacterCurve3D = 220,  ///< \ru Кривая, координатные функции которой заданы в символьном виде. \en Functionally defined curve.
    ContourOnSurface = 221,  ///< \ru Контур на поверхности. \en Contour on the surface.
    ContourOnPlane = 222,  ///< \ru Контур на плоскости. \en Contour on the plane.
    SurfaceCurve = 223,  ///< \ru Кривая на поверхности. \en Curve on the surface.
    SilhouetteCurve = 224,  ///< \ru Силуэтная кривая. \en Silhouette curve.
    SurfaceIntersectionCurve = 225,  ///< \ru Кривая пересечения поверхностей. \en Curve as intersection of surfaces.
    BSpline = 226,  ///< \ru В-сплайн. \en B-spline.
    Contour3D = 227,  ///< \ru Контур. \en Contour.
    CoonsDerivative = 228,  ///< \ru Кривая производных поверхности Кунса. \en Curve of Coons surface derivetives.
    FreeCurve3D = 300,  ///< \ru Тип для кривых, созданных пользователем. \en Type for the user-defined curves. \n 

    // \ru Типы поверхностей. \en Surface types. 
    Surface = 301,  ///< \ru Поверхность. \en Surface.
    ElementarySurface = 302,  ///< \ru Элементарная поверхность. \en Elementary surface.
    Plane = 303,  ///< \ru Плоскость. \en Plane.
    ConeSurface = 304,  ///< \ru Коническая поверхность. \en Conical surface.
    CylinderSurface = 305,  ///< \ru Цилиндрическая поверхность. \en Cylindrical surface.
    SphereSurface = 306,  ///< \ru Сфера. \en Sphere.
    TorusSurface = 307,  ///< \ru Тор. \en Torus.
    SweptSurface = 308,  ///< \ru Поверхность движения. \en Swept surface.
    ExtrusionSurface = 309,  ///< \ru Поверхность перемещения. \en Extrusion surface.
    RevolutionSurface = 310,  ///< \ru Поверхность вращения. \en Revolution surface.
    EvolutionSurface = 311,  ///< \ru Поверхность заметания. \en Swept surface with guide curve.
    ExactionSurface = 312,  ///< \ru Поверхность заметания с поворотными торцами. \en Swept surface with rotating ends.
    ExpansionSurface = 313,  ///< \ru Плоскопараллельная поверхность. \en Plane-parallel swept surfaces.
    SpiralSurface = 314,  ///< \ru Спиральная поверхность. \en Spiral surface.
    RuledSurface = 315,  ///< \ru Линейчатая поверхность. \en Ruled surface.
    SectorSurface = 316,  ///< \ru Секториальная поверхность. \en Sectorial surface.
    PolySurface = 317,  ///< \ru Поверхность, определяемая точками. \en Surface constructed by points.
    HermitSurface = 318,  ///< \ru Hermit поверхность, определяемая точками. \en Hermit surface.
    SplineSurface = 319,  ///< \ru NURBS поверхность, определяемая точками. \en NURBS surface.
    GridSurface = 320,  ///< \ru Поверхность, определяемая точками. \en Surface defined by points.
    TriBezierSurface = 321,  ///< \ru Треугольная Bezier поверхность, определяемая точками. \en Triangular Bezier surface.
    TriSplineSurface = 322,  ///< \ru Треугольная NURBS поверхность, определяемая точками. \en Triangular NURBS surface.
    OffsetSurface = 323,  ///< \ru Эквидистантная поверхность. \en Offset surface.
    DeformedSurface = 324,  ///< \ru Деформированная поверхность. \en Deformed surface.
    NurbsSurface = 325,  ///< \ru NURBS поверхность, определяемая кривыми. \en NURBS surface defined by curves.
    CornerSurface = 326,  ///< \ru Поверхность по трем кривым. \en The surface based on three curves.
    CoverSurface = 327,  ///< \ru Поверхность по четырем кривым. \en The surface based on the four curves.
    CoonsPatchSurface = 328,  ///< \ru Бикубическая поверхность Кунса по четырем кривым. \en Bicubic Coons surface constructed by four curves.
    GregoryPatchSurface = 329,  ///< \ru Поверхность Грегори по четырем кривым. \en Gregory surface constructed by four curves.
    LoftedSurface = 330,  ///< \ru Поверхность, проходящая через заданное семейство кривых. \en Lofted surface.
    ElevationSurface = 331,  ///< \ru Поверхность, проходящая через заданное семейство кривых, с направляющей. \en Lofted surface with the guide.
    MeshSurface = 332,  ///< \ru Поверхность на сетке кривых. \en The surface constructed by the grid curves.
    GregorySurface = 333,  ///< \ru Поверхность на ограничивающем контуре. \en The surface on the bounding contour.
    SmoothSurface = 334,  ///< \ru Поверхность сопряжения. \en Conjugation surface.
    ChamferSurface = 335,  ///< \ru Поверхность фаски. \en The surface of the bevel.
    FilletSurface = 336,  ///< \ru Поверхность скругления. \en Fillet surface.
    ChannelSurface = 337,  ///< \ru Поверхность скругления с переменным радиусом. \en Fillet surface with variable radius.
    FullFilletSurface = 338,  ///< \ru Поверхность полного скругления. \en Full fillet surface.
    JoinSurface = 339,  ///< \ru Поверхность соединения. \en The surface of the joint.
    CurveBoundedSurface = 340,  ///< \ru Ограниченная кривыми поверхность. \en The surface bounded by curves.
    BendedUnbendedSurface = 341,  ///< \ru Поверхность, полученная сгибом/разгибом. \en Surface constructed by fold / unbending.
    CylindricBendedSurface = 342,  ///< \ru Поверхность, полученная цилиндрическим сгибом. \en Surface constructed by cylindrical fold.
    CylindricUnbendedSurface = 343,  ///< \ru Поверхность, полученная цилиндрическим разгибом. \en Surface constructed by cylindrical unbending.
    ConicBendedSurface = 344,  ///< \ru Поверхность, полученная коническим сгибом. \en Surface constructed by conical fold.
    ConicUnbendedSurface = 345,  ///< \ru Поверхность, полученная коническим разгибом. \en Surface constructed by conical unbending.
    GregoryRibbonPatchSurface = 346,  ///< \ru Поверхность Грегори с граничными условиями. \en Gregory patch surface with ribbons.
    ExplorationSurface = 347,  ///< \ru Поверхность заметания с масштабированием и поворотом образующей кривой. \en Swept surface with scaling and winding of generating curve.
    SectionSurface = 348,  ///< \ru Поверхность заметания переменного сечения. \en The swept mutable section surface.
    FreeSurface = 400,  ///< \ru Тип для поверхностей, созданных пользователем. \en Type for the user-defined surfaces. \n 

    // \ru Типы вспомогательных объектов. \en Helper object types. 
    Legend = 401,  ///< \ru Вспомогательный объект. \en The helper object.
    Marker = 402,  ///< \ru Точка и двойка ортонормированных векторов (применяется в сопряжениях, в кинематике). \en Point and two orthonormal vectors.
    Thread = 403,  ///< \ru Резьба. \en Thread.
    Symbol = 404,  ///< \ru Условное обозначение. \en Symbol.
    PointsSymbol = 405,  ///< \ru Условное обозначение на базовых точках. \en Symbol on the basic points.
    Rough = 406,  ///< \ru Обозначение шероховатости. \en Designation of roughness.
    Leader = 407,  ///< \ru Обозначение линии выноски. \en Designation of the leader line.
    Dimension3D = 408,  ///< \ru Размер. \en Dimension
    LinearDimension3D = 409,  ///< \ru Линейный размер. \en Linear dimension. 
    DiameterDimension3D = 410,  ///< \ru Диаметральный размер. \en Diameter dimension. 
    RadialDimension3D = 411,  ///< \ru Радиальный размер. \en Radial dimension. 
    AngularDimension3D = 412,  ///< \ru Угловой размер. \en Angular dimension. 
    FreeLegend = 500,  ///< \ru Тип для вспомогательных объектов, созданных пользователем. \en Type for the user helper objects. \n 

    // \ru Типы объектов модели геометрического ядра с журналом построения и атрибутами. \en Model object types with history tree and attributes. 
    Item = 501,  ///< \ru Геометрический объект модели. \en Model object.
    AssistedItem = 502,  ///< \ru Локальная система координат. \en The local coordinate system.
    PointFrame = 503,  ///< \ru Точечный каркас. \en Point frame.
    WireFrame = 504,  ///< \ru Проволочный каркас. \en Wire frame.
    Solid = 505,  ///< \ru Твердое тело. \en Solid.
    Instance = 506,  ///< \ru Объект модели в локальной системе координат. \en The model object in the local coordinate system.
    Assembly = 507,  ///< \ru Сборочная единица объектов модели. \en Assembly unit of model objects.
    Mesh = 508,  ///< \ru Полигональный объект в виде точек, ломаных и пластин. \en Polygonal form of an object as a set of points, polylines, and plates.
    SpaceInstance = 509,  ///< \ru Обертка над геометрическим объектом MbSpaceItem. \en Wrapper over a geometry MbSpaceItem.
    PlaneInstance = 510,  ///< \ru Обертка над плоским объектом MbPlaneItem. \en Wrapper over a flat object MbPlaneItem.
    Collection = 511,  ///< \ru Коллекция элементов. \en Collection of elements. \n

    FreeItem = 600,  ///< \ru Тип для объектов, созданных пользователем. \en Type for the user-defined objects.
}

export enum CopyMode {
    Same = 0,
    KeepHistory,
    KeepSurface,
    Copy
}

export enum OperationType {
    Internal = -4, ///< \ru Пересечение оболочек. \en Shells intersection. 
    External = -3, ///< \ru Вычитание   оболочек. \en Shells subtraction. 
    Intersect = -2, ///< \ru Пересечение тел. \en Solids intersection. 
    Difference = -1, ///< \ru Вычитание   тел. \en Solids subtraction. 
    Unknown = 0, ///< \ru Неопределённая операция. \en Undefined operation. 
    Union = 1, ///< \ru Объединение тел. \en Solids union. 
    Base = 2, ///< \ru Исходное состояние. \en Initial state. 
    Variety = 3, ///< \ru Объединение оболочек. \en Shells union. 
}

export enum SmoothForm {
    Span = -1,  ///< \ru Скругление с заданной хордой. \en Fillet with a given chord. 
    Fillet = 0,  ///< \ru Скругление с заданными радиусами. \en Fillet with given radii. 
    Chamfer = 1,  ///< \ru Фаска с заданными катетами. \en Chamfer with given cathetuses. 
    Slant1 = 2,  ///< \ru Фаска по катету и углу (катет distance2 рассчитан для прямого угла между гранями и определяет прилегающий к катету distance1 угол). \en Chamfer by cathetus and angle (distance2 cathetus is calculated for right angle between faces and defines angle adjacent to the distance1 cathetus). 
    Slant2 = 3,  ///< \ru Фаска по углу и катету (катет distance1 рассчитан для прямого угла между гранями и определяет прилегающий к катету distance2 угол). \en Chamfer by angle and cathetus (distance1 cathetus is calculated for right angle between faces and defines angle adjacent to the distance2 cathetus). 
}

export enum ThreeStates {
    negative = -1, ///< \ru Состояние НЕТ. \en The state NO. 
    neutral = 0, ///< \ru Состояние НЕ ИЗВЕСТНО. \en The state UNKNOWN. 
    positive = 1  ///< \ru Состояние ДА. \en The state YES. 
}

export enum CornerForm {
    pointed = 0, ///< \ru Обработка угла отсутствует. \en Processing of corner is missing.
    either = 1, ///< \ru Стыкующиеся в одной точке три ребра обрабатываются в порядке внутренней нумерации ребер без учета выпуклости и вогнутости. \en Mating at one point of three edges are processed in the order of internal indexation of edges without convexity and concavity.
    uniform = 2, ///< \ru Если в точке стыкуются два выпуклых (вогнутых) и одно вогнутое (выпуклое) ребро, то первым  обрабатывается вогнутое (выпуклое) ребро. \en If two convex (concave) and one concave (convex) edge are mated at the point, then concave (convex) edge is processed at the first.
    sharp = 3, ///< \ru Если в точке стыкуются два выпуклых (вогнутых) и одно вогнутое (выпуклое) ребро, то первыми обрабатываются выпуклые (вогнутые) ребра. \en If two convex (concave) and one concave (convex) edge are mated at the point, then concave (convex) edges are processed at the first.
}

export enum CreatorType {
    Undefined = 0,  ///< \ru Неизвестный объект. \en Unknown object.
    Creator = 1,  ///< \ru Строитель объекта. \en Constructor of object. \n

    // \ru Строители точек. \en Creators of points. 
    PointsCreator = 101,  ///< \ru Строитель точечного каркаса. \en Constructor of point-frame. \n 

    // \ru Строители кривых. \en Creators of curves. 
    Curve3DCreator = 201,  ///< \ru Строитель кривой. \en Constructor of curve. 
    Nurbs3DCreator = 202,  ///< \ru Строитель сплайна с сопряжениями. \en Constructor of spline with tangents. 
    SurfaceSplineCreator = 203,  ///< \ru Строитель сплайна на поверхности с сопряжениями. \en Constructor of spline on a surface with tangents. 
    ProjectionCurveCreator = 204,  ///< \ru Строитель проекционной кривой. \en Constructor of the projection curve. 
    OffsetCurveCreator = 205,  ///< \ru Строитель эквидистантной кривой. \en Constructor of the offset curve. 
    IntersectionCurveCreator = 206,  ///< \ru Строитель кривой пересечения. \en Constructor of the intersection curve. 
    ConnectingCurveCreator = 207,  ///< \ru Строитель кривой скругления двух кривых. \en Constructor of the curve connecting two curves. \n

    // \ru Строители тел. \en Creators of solids. 
    ShellCreator = 501,  ///< \ru Строитель оболочки. \en Constructor of shell. 
    SimpleCreator = 502,  ///< \ru Строитель оболочки без истории. \en Constructor of a shell without history. 
    ElementarySolid = 503,  ///< \ru Строитель оболочки в форме: блока, клина, цилиндра, конуса, шара, тора. \en Constructor of a shell as: a block, a wedge, a cylinder, a cone, a sphere, a torus. 
    CurveSweptSolid = 504,  ///< \ru Строитель оболочки движения. \en Constructor of a swept shell. 
    CurveExtrusionSolid = 505,  ///< \ru Строитель оболочки выдавливания. \en Constructor of a shell of extrusion. 
    CurveRevolutionSolid = 506,  ///< \ru Строитель оболочки вращения. \en Constructor of a shell of revolution. 
    CurveEvolutionSolid = 507,  ///< \ru Строитель кинематической оболочки. \en Constructor of a shell of evolution. 
    CurveLoftedSolid = 508,  ///< \ru Строитель оболочки по плоским сечениям. \en Constructor of lofted shell. 
    BooleanSolid = 509,  ///< \ru Строитель оболочки булевой операции. \en Constructor of a shell of boolean operation. 
    CuttingSolid = 510,  ///< \ru Строитель разрезанной поверхностью оболочки. \en Constructor of a shell cut by surface. 
    SymmetrySolid = 511,  ///< \ru Строитель симметричной оболочки. \en Constructor of a symmetric shell. 
    HoleSolid = 512,  ///< \ru Строитель оболочки отверстия, кармана или фигурного паза. \en Constructor of a shell of a hole, a pocket or a groove. 
    SmoothSolid = 513,  ///< \ru Строитель оболочки с фаской или скруглением ребер. \en Constructor of a shell with a chamfer or with edges fillet. 
    ChamferSolid = 514,  ///< \ru Строитель оболочки с фаской ребер. \en Constructor of a shell with edges chamfer. 
    FilletSolid = 515,  ///< \ru Строитель оболочки со скруглением ребер. \en Constructor of a shell with edges fillet. 
    FullFilletSolid = 516,  ///< \ru Строитель оболочки со скруглением граней. \en Constructor of a shell with a faces fillet. 
    ShellSolid = 517,  ///< \ru Строитель тонкостенной оболочки, эквидистантной оболочки, придания толщины. \en Constructor of a thin-walled shell, an offset shell, thickening. 
    DraftSolid = 518,  ///< \ru Строитель оболочки с литейным уклоном. \en Constructor of a shell with a pattern taper. 
    RibSolid = 519,  ///< \ru Строитель оболочки с ребром жесткости. \en Constructor of a shell with a rib. 
    SplitShell = 520,  ///< \ru Строитель оболочки с подразбиением граней. \en Constructor of a shell with faces subdivision. 
    NurbsBlockSolid = 521,  ///< \ru Строитель оболочки в форме блока из nurbs-поверхностей. \en Constructor of a shell as a block from NURBS surfaces: 
    FaceModifiedSolid = 522,  ///< \ru Строитель модифицированной оболочки. \en Constructor of a modified shell. 
    ModifiedNurbsItem = 523,  ///< \ru Строитель модифицированной nurbs-поверхностями оболочки. \en Constructor of a shell with modified NURBS surfaces. 
    NurbsModification = 524,  ///< \ru Строитель модифицированной контрольными точками оболочки. \en Constructor of a shell modified by control points. 
    TransformedSolid = 525,  ///< \ru Строитель трансформированной оболочки. \en Constructor of a transformed shell. 
    ThinShellCreator = 526,  ///< \ru Строитель тонкой оболочки. \en Constructor of a thin shell. 
    UnionSolid = 527,  ///< \ru Строитель объединённой оболочки. \en Constructor of a united shell. 
    DetachSolid = 528,  ///< \ru Строитель оболочки из отделяемой части многосвязной оболочки. \en Constructor of a shell from the detached part of a multiply connected shell. 
    DuplicationSolid = 529,  ///< \ru Строитель множества тел, построенных из исходного. \en Constructor of set of solids built from the original. \n
    ReverseCreator = 530,  ///< \ru Строитель вывернутого "наизнанку" тела. \en Constructor of a reversed solid. \n
    DividedShell = 531,  ///< \ru Строитель разделенной на части оболочки \en Constructor of a divided shell. 

    // \ru Строители листовых тел. \en Creators of sheet solids. 
    SheetMetalSolid = 601,  ///< \ru Строитель листовой оболочки. \en Constructor of a sheet shell. 
    BendOverSegSolid = 602,  ///< \ru Строитель оболочки со сгибом относительно отрезка. \en Constructor of a shell with a bend at the segment. 
    JogSolid = 603,  ///< \ru Строитель оболочки с подсечкой. \en Constructor of a shell with a jog. 
    BendsByEdgesSolid = 604,  ///< \ru Строитель оболочки со сгибом по ребру. \en Constructor of a shell with a bend at the edge. 
    BendUnbendSolid = 605,  ///< \ru Строитель оболочки с выполненным сгибом или разгибом. \en Constructor of a shell with bending or unbending. 
    ClosedCornerSolid = 606,  ///< \ru Строитель оболочки с замыканием угла. \en Constructor of a shell with corner enclosure. 
    StampSolid = 607,  ///< \ru Строитель оболочки с штамповкой. \en Constructor of a shell with stamping. 
    SphericalStampSolid = 608,  ///< \ru Строитель оболочки со сферической штамповкой. \en Constructor of a shell with spherical stamping. 
    BeadSolid = 609,  ///< \ru Строитель оболочки с буртиком. \en Constructor of a shell with a bead. 
    JalousieSolid = 610,  ///< \ru Строитель оболочки с жалюзи. \en Constructor of a shell with jalousie. 
    JointBendSolid = 611,  ///< \ru Строитель оболочки с комбинированным сгибом. \en Constructor of a shell with a composite bend. 
    StitchedSolid = 612,  ///< \ru Строитель оболочки, сшитой из нескольких граней или оболочек. \en Constructor of a shell stitched from several faces or shells. 
    RuledSolid = 613,  ///< \ru Строитель линейчатой оболочки (обечайки). \en Constructor of a ruled shell (shell ring). 
    RestoredEdgesSolid = 614,  ///< \ru Строитель листовой оболочки с восстановленными боковыми рёбрами. \en Constructor of a sheet shell with restored lateral edges. 
    SheetUnionSolid = 615,  ///< \ru Строитель объединения двух листовых тел по торцу. \en Constructor of two sheet solids union by the side.
    StampRibSolid = 616,  ///< \ru Строитель ребра жесткости листового тела. \en Constructor of sheet solid rib. \n
    BendAnySolid = 617,  ///< \ru Строитель оболочки с выполненным сгибом нелистового тела. \en Constructor of a shell with bending of non-sheet solid
    SimplifyFlatSolid = 618,  ///< \ru Строитель упрощения развёртки листового тела. \en Constructor of the sheet solid flat pattern simplification.
    UserStampSolid = 619,  ///< \ru Строитель оболочки с штамповкой телом. \en Constructor of a shell with stamping by solid. 
    RemoveOperationSolid = 620,  ///< \ru Строитель удаления операции листового тела. \en Constructor of removing of the sheet solid.
    BuildSheetMetalSolid = 621,  ///< \ru Строитель листового тела по произвольному телу. \en Constructor of building sheet metal solid based on an arbitary solid.

    // \ru Строители оболочек. \en Creators of shells. 
    JoinShell = 701,  ///< \ru Строитель оболочки соединения. \en Constructor of a joint shell. 
    MeshShell = 702,  ///< \ru Строитель оболочки по поверхностям на сетках кривых. \en Constructor of a shell by surfaces constructed by the grid curves. 
    RuledShell = 703,  ///< \ru Строитель оболочки по набору линейчатых поверхностей. \en Constructor of a shell by a set of ruled surfaces.   
    NurbsSurfacesShell = 704,  ///< \ru Строитель NURBS-оболочки на двумерном массиве точек. \en Constructor of a NURBS-shell on a two-dimensional array of points. 
    TruncatedShell = 705,  ///< \ru Строитель оболочки, усеченная геометрическими объектами. \en Constructor of a shell truncated by geometric objects. 
    ExtensionShell = 706,  ///< \ru Строитель продолженной оболочки. \en Constructor of an extended shell. 
    PatchSetCreator = 707,  ///< \ru Строитель заплатки по кривым на оболочке. \en Constructor of a patch by curves on the shell. 
    FilletShell = 708,  ///< \ru Строитель оболочки грани соединения. \en Constructor of a shell of a fillet face. 
    MedianShell = 709,  ///< \ru Строитель срединной оболочки тела. \en Constructor of a median shell of solid. \n
    SectionShell = 710,  ///< \ru Строитель оболочки на поверхности переменного сечения. \en Constructor of the shell on swept mutable section surface. \n

    // \ru Строители других объектов (вставлять новые типы перед этим типом). \en Creators of the other objects (insert new types before this type). 
    AttributeProvider = 801,  ///< \ru Поставщик атрибутов для примитивов оболочки. \en Attribute provider for the shell primitives. 

    FreeItem = 900,  ///< \ru Тип для объектов, созданных пользователем. \en Type for the user-defined objects.

}

export enum ModifyingType {
    Remove = 0, ///< \ru Удаление из тела выбранных граней с окружением. \en Removal of the specified faces with the neighborhood from a solid.
    Create,     ///< \ru Создание тела из выбранных граней с окружением. \en Creation of a solid from the specified faces with the neighborhood.
    Action,     ///< \ru Перемещение выбранных граней с окружением относительно оставшихся граней тела. \en Translation of the specified faces with neighborhood relative to the other faces of the solid.
    Offset,     ///< \ru Замена выбранных граней тела эквидистантными гранями (перемещение по нормали, изменение радиуса). \en Replacement of the specified faces of a solid with the offset faces (translation along the normal, change of the radius).
    Fillet,     ///< \ru Изменение радиусов выбранных граней скругления. \en Change of radii of the specified fillet faces.
    Supple,     ///< \ru Замена выбранных граней тела деформируемыми гранями (превращение в NURBS для редактирования). \en Replacement of the specified faces of a solid with a deformable faces (conversion to NURBS for editing).
    Purify,     ///< \ru Удаление из тела выбранных скруглений. \en Removal of the specified fillets from a solid.
    Merger,     ///< \ru Слияние вершин ребёр и удаление рёбер. \en Merging vertices of edges and edges removal.
    United,     ///< \ru Замена гладко стыкующихся граней одной гранью. \en Replacing smoothly joined faces with one face.
}

export enum FacePropagation {
    None = 0,  ///< \ru Без захвата. \en Without capture. 
    All = 1,  ///< \ru Захват всех граней. \en Capture all faces. 
    SmoothlyJointedAlong = 2,  ///< \ru Прохождение по гладкостыкующимся граням через сонаправленные ребра (прямолинейные). \en Movement on smooth-joint faces through collinear edges (straight). 
    SmoothlyJointedOrtho = 3,  ///< \ru Прохождение по гладкостыкующимся граням через ортогональные ребра (прямолинейные.) \en Movement on smooth-joint faces through orthogonal edges (straight). 
    SmoothlyJointed = 4,  ///< \ru Прохождение по гладкостыкующимся граням через прямолинейные ребра. \en Movement on smooth-joint faces through straight edges. //-V112 
};

export enum PlaneType {

    Undefined = 0,  ///< \ru Неизвестный объект. \en Unknown object. 
    PlaneItem = 1,  ///< \ru Произвольный двумерный объект. \en Arbitrary two-dimensional object. \n 

    // \ru Типы кривых. \en Types of curves.
    Curve = 201,  ///< \ru Произвольная кривая. \en Arbitrary curve. 
    Line = 202,  ///< \ru Прямая. \en Line. 
    LineSegment = 203,  ///< \ru Отрезок. \en Segment. 
    Arc = 204,  ///< \ru Окружность или эллипс или дуга окружности или дуга эллипсa. \en Circle or ellipse or arc of circle or arc of ellipse. 
    Cosinusoid = 205,  ///< \ru Кривая-косинусоида. \en Cosine curve. 
    PolyCurve = 206,  ///< \ru Сплайновая кривая. \en Spline curve. 
    Polyline = 207,  ///< \ru Полилиния. \en Polyline. 
    Bezier = 208,  ///< \ru Безье-сплайн. \en Bezier spline. 
    Hermit = 209,  ///< \ru Составной кубический сплайн Эрмита. \en Composite cubic Hermite spline. 
    Nurbs = 210,  ///< \ru NURBS кривая. \en NURBS-curve. 
    CubicSpline = 211,  ///< \ru Кубический сплайн. \en Cubic spline. 
    TrimmedCurve = 212,  ///< \ru Усеченная кривая. \en Trimmed curve. 
    OffsetCurve = 213,  ///< \ru Эквидистантная продленная кривая. \en Extended offset curve. 
    ReparamCurve = 214,  ///< \ru Репараметризованная кривая. \en Reparametrized curve. 
    PointCurve = 215,  ///< \ru Кривая - точка. \en Point-curve. 
    CharacterCurve = 216,  ///< \ru Кривая, координатные функции которой заданы в символьном виде. \en Functionally defined curve. 
    ProjCurve = 217,  ///< \ru Проекционная кривая. \en Projection curves. 
    SweptImageCurve = 218,  ///< \ru Образ трехмерной кривой на поверхности при движении по направляющей. \en Image of three-dimensional curve on surface while moving along a guide curve. 
    TransformedCurve = 219,  ///< \ru Трансформированная кривая. \en Transformed curve. 
    ConeBendedCurve = 220,  ///< \ru Кривая в параметрической области конуса, соответствующая кривой в параметрической области плоскости при коническом сгибе. \en Curve in parametric region of a cone corresponding to curve in parametric region of plane at a conic bend. 
    ConeUnbendedCurve = 221,  ///< \ru Кривая в параметрической области плоскости, соответствующая кривой в параметрической области конуса при коническом сгибе. \en Curve in parametric region of a plane corresponding to curve in parametric region of a cone at conic bend. 

    // \ru Типы сложных кривых. \en Types of complex curves.
    Contour = 301,  ///< \ru Контур - составная кривая. \en Contour - composite curve. 
    ContourWithBreaks = 302,  ///< \ru Контур с разрывами . \en Contour with discontinuities. 
    FreeCurve = 400,  ///< \ru Тип для кривых, созданных пользователем. \en User-defined curve. \n 

    // \ru Типы сложных объектов. \en Types of complex objects. 
    Multiline = 401,  ///< \ru Мультилиния. \en Multiline. 

    // \ru Типы других объектов. \en Types of other objects. 
    Region = 501,  ///< \ru Регион. \en Region. 

    FreeItem = 600,  ///< \ru Тип для объектов, созданных пользователем. \en Type for the user-defined objects.

};

Object.assign(c3d, {
    ESides: ESides,
    StepType: StepType,
    SpaceType: SpaceType,
    ElementaryShellType: ElementaryShellType,
    CopyMode: CopyMode,
    OperationType: OperationType,
    SmoothForm: SmoothForm,
    ThreeStates: ThreeStates,
    CornerForm: CornerForm,
    CreatorType: CreatorType,
    ModifyingType: ModifyingType,
    FacePropagation: FacePropagation,
    PlaneType: PlaneType,
});
