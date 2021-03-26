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

Object.assign(c3d, { ESides: ESides, StepType: StepType, SpaceType: SpaceType });
