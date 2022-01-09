declare module "*c3d.node" {
    declare type SimpleName = number;

    declare interface AttributeContainer {
        GetStyle(): number;
        SetStyle(s: number): void;
    }

    <%_ for (c of classes) if (c.templatePrefix == 'class') { _%>
        <%_ if (c.cppClassName == 'AttributeContainer') continue; _%>
        declare class <%- c.jsClassName %><%_ if (c.extends.length > 0) { %> extends <%- c.extends[0].jsClassName %><%_ } _%><%_ if (c.extends.length > 1) { %> implements <%- c.extends[1].jsClassName %><%_ } _%> {
            <%_ if (c.extends.length == 0) { %>private _useNominal: undefined;<% } %>
            <%_ for (const init of c.initializers) { _%>
                constructor(<%- include('params.d.ts', { params: init.params }) %>);
            <%_ } %>
            <%_ for (const func of c.nonInheritedFunctions.concat(c.implements)) { _%>
                <%_ if (func.name == 'Cast') { _%>
                    Cast<T extends PlaneItem | SpaceItem | MbCreator | TopologyItem>(t: number): T;
                <%_ } else { _%>
                    <%- include('sync_function.d.ts', { func: func }) %>
                <%_ } _%>
            <%_ } _%>
            <%_ for (const field of c.fields) { _%>
                <%- field.name %>: <%- field.jsType %>;
            <%_ } _%>
            <%_ if (!c.isPOD) { _%>
                Id(): bigint;
            <%_ } _%>
            }
        
    <%_ } _%>

    <%_ for (c of classes) if (c.templatePrefix == 'module') { _%>
        <%_ if (c.cppClassName == 'AttributeContainer') continue; _%>
        const <%- c.cppClassName %>: {
            <%_ for (const func of c.functions) { _%>
                <%- include('sync_function.d.ts', { func: func }) %>
            <%_ } _%>
        }
        
    <%_ } _%>

    declare interface MeshBuffer {
        index: Uint32Array;
        position: Float32Array;
        normal: Float32Array;
        style: number;
        simpleName: number;
        name: Name;
        i: number;
        grid: Grid;
    }

    declare interface EdgeBuffer {
        position: Float32Array;
        style: number;
        simpleName: number;
        name: Name;
        i: number;
    }

    declare enum ESides {
        SideNone, SidePlus, SideMinus
    }

    declare enum StepType {
        SpaceStep, DeviationStep, MetricStep, ParamStep, CollisionStep, MipStep
    }

    declare enum ElementaryShellType {
        Sphere, Torus, Cylinder, Cone, Block, Wedge, Prism, Pyramid, Plate, Isocahedron, Polyhedron, Tetrapipe, Octapipe
    }

    declare enum SpaceType {
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

    declare enum CopyMode {
        Same, KeepHistory, KeepSurface, Copy
    }

    declare enum OperationType {
        Internal, External, Intersect, Difference, Unknown, Union, Base, Variety
    }

    declare enum SmoothForm {
        Span, Fillet, Chamfer, Slant1, Slant2
    }

    declare enum ThreeStates {
        negative, neutral, positive
    }

    declare enum CornerForm {
        pointed, either, uniform, sharp
    }

    declare enum CreatorType {
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

    declare enum ModifyingType {
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

    
    declare enum FacePropagation {
        None = 0,  ///< \ru Без захвата. \en Without capture. 
        All = 1,  ///< \ru Захват всех граней. \en Capture all faces. 
        SmoothlyJointedAlong = 2,  ///< \ru Прохождение по гладкостыкующимся граням через сонаправленные ребра (прямолинейные). \en Movement on smooth-joint faces through collinear edges (straight). 
        SmoothlyJointedOrtho = 3,  ///< \ru Прохождение по гладкостыкующимся граням через ортогональные ребра (прямолинейные.) \en Movement on smooth-joint faces through orthogonal edges (straight). 
        SmoothlyJointed = 4,  ///< \ru Прохождение по гладкостыкующимся граням через прямолинейные ребра. \en Movement on smooth-joint faces through straight edges. //-V112 
    };

    declare enum PlaneType {

        Undefined         =   0,  ///< \ru Неизвестный объект. \en Unknown object. 
        PlaneItem         =   1,  ///< \ru Произвольный двумерный объект. \en Arbitrary two-dimensional object. \n 
      
        // \ru Типы кривых. \en Types of curves.
        Curve             = 201,  ///< \ru Произвольная кривая. \en Arbitrary curve. 
        Line              = 202,  ///< \ru Прямая. \en Line. 
        LineSegment       = 203,  ///< \ru Отрезок. \en Segment. 
        Arc               = 204,  ///< \ru Окружность или эллипс или дуга окружности или дуга эллипсa. \en Circle or ellipse or arc of circle or arc of ellipse. 
        Cosinusoid        = 205,  ///< \ru Кривая-косинусоида. \en Cosine curve. 
        PolyCurve         = 206,  ///< \ru Сплайновая кривая. \en Spline curve. 
        Polyline          = 207,  ///< \ru Полилиния. \en Polyline. 
        Bezier            = 208,  ///< \ru Безье-сплайн. \en Bezier spline. 
        Hermit            = 209,  ///< \ru Составной кубический сплайн Эрмита. \en Composite cubic Hermite spline. 
        Nurbs             = 210,  ///< \ru NURBS кривая. \en NURBS-curve. 
        CubicSpline       = 211,  ///< \ru Кубический сплайн. \en Cubic spline. 
        TrimmedCurve      = 212,  ///< \ru Усеченная кривая. \en Trimmed curve. 
        OffsetCurve       = 213,  ///< \ru Эквидистантная продленная кривая. \en Extended offset curve. 
        ReparamCurve      = 214,  ///< \ru Репараметризованная кривая. \en Reparametrized curve. 
        PointCurve        = 215,  ///< \ru Кривая - точка. \en Point-curve. 
        CharacterCurve    = 216,  ///< \ru Кривая, координатные функции которой заданы в символьном виде. \en Functionally defined curve. 
        ProjCurve         = 217,  ///< \ru Проекционная кривая. \en Projection curves. 
        SweptImageCurve   = 218,  ///< \ru Образ трехмерной кривой на поверхности при движении по направляющей. \en Image of three-dimensional curve on surface while moving along a guide curve. 
        TransformedCurve  = 219,  ///< \ru Трансформированная кривая. \en Transformed curve. 
        ConeBendedCurve   = 220,  ///< \ru Кривая в параметрической области конуса, соответствующая кривой в параметрической области плоскости при коническом сгибе. \en Curve in parametric region of a cone corresponding to curve in parametric region of plane at a conic bend. 
        ConeUnbendedCurve = 221,  ///< \ru Кривая в параметрической области плоскости, соответствующая кривой в параметрической области конуса при коническом сгибе. \en Curve in parametric region of a plane corresponding to curve in parametric region of a cone at conic bend. 
      
        // \ru Типы сложных кривых. \en Types of complex curves.
        Contour           = 301,  ///< \ru Контур - составная кривая. \en Contour - composite curve. 
        ContourWithBreaks = 302,  ///< \ru Контур с разрывами . \en Contour with discontinuities. 
        FreeCurve         = 400,  ///< \ru Тип для кривых, созданных пользователем. \en User-defined curve. \n 
      
        // \ru Типы сложных объектов. \en Types of complex objects. 
        Multiline         = 401,  ///< \ru Мультилиния. \en Multiline. 
      
        // \ru Типы других объектов. \en Types of other objects. 
        Region            = 501,  ///< \ru Регион. \en Region. 
      
        FreeItem          = 600,  ///< \ru Тип для объектов, созданных пользователем. \en Type for the user-defined objects.
      
    };

    declare enum RegionOperationType {
        Intersect = -2,  ///< \ru Операция пересечение. \en Intersection operation. 
        Difference = -1, ///< \ru Операция разность. \en Subtraction operation. 
        Unknown = 0,     ///< \ru Неопределенная операция. \en Undefined operation. 
        Union = 1,       ///< \ru Операция объединение. \en Union operation. 
    };

    declare enum LocalSystemType3D 
    {
        CartesianSystem,   ///< \ru Декартова система координат. \en Cartesian coordinate system. 
        CylindricalSystem, ///< \ru Цилиндрическая система координат. \en Cylindrical coordinate system. 
        SphericalSystem,   ///< \ru Сферическая система координат. \en Spherical coordinate system. 
    };

    declare enum ConnectingType {
        Fillet = 0, ///< \ru Скругление круговое на цилиндре. \en Circular fillet on the cylinder. 
        OnSurface = 1, ///< \ru Скругление пересечением цилиндра и общей поверхности сопрягаемых кривых. \en Fillet by intersection of the cylinder and common surface of the mating curves. 
        Spline = 2, ///< \ru Сопряжение сплайном. \en Conjugation by spline. 
        Double = 3, ///< \ru Сопряжение двумя дугами. \en Conjugation by two arcs. 
        Bridge = 4, ///< \ru Сопряжение кубической кривой. \en Conjugation by a cubic curve. 
    };

    declare enum ItemLocation {
        Undefined = -3,  ///< \ru Не определялось. \en Not defined. 
        Unknown = -2,  ///< \ru Не получилось определить. \en Failed to define. 
        OutOfItem = -1,  ///< \ru Вне объекта. \en Outside the object. 
        OnItem = 0,  ///< \ru На объекте (на границе). \en On the object (on the boundary). 
        InItem = 1,  ///< \ru Внутри объекта. \en Inside the object. 
        ByItem = 2,  ///< \ru Условно внутри объекта (для незамкнутых оболочек). \en Conditionally inside the object (for non-closed shells). 
    };

    declare enum Location {
        Undefined = ItemLocation.Unknown,   ///< \ru Положение не определено, кривая разомкнута.  \en Failed to define, curve is not closed. 
        Outside = ItemLocation.OutOfItem, ///< \ru Точка снаружи замкнутой кривой. \en Outside the curve. 
        OnCurve = ItemLocation.OnItem,    ///< \ru Точка на кривой. \en On the curve. 
        Inside = ItemLocation.InItem,    ///< \ru Точка внутри замкнутой кривой. \en Inside the curve. 
    };

    declare enum ProcessState {
        Error         = -3, ///< \ru Ошибка. \en Error. 
        Skip          = -2, ///< \ru Пропущено. \en Has been skipped. 
        Stop          = -1, ///< \ru Остановлено. \en Has been stopped. 
        Success       =  0, ///< \ru Выполнено. \en Done. 
        SelfIntersect = 24, ///< \ru Выполнено. Объект самопересекается. \en Done. Self-intersecting object.
    };

    declare enum TopologyType {

        Undefined    =   0,  ///< \ru Неизвестный объект. \en Unknown object. 
        TopItem      =   1,  ///< \ru Топологический объект. \en A topological object. \n
      
        Vertex       = 101,  ///< \ru Вершина. \en A vertex. 
      
        Edge         = 201,  ///< \ru Ребро, проходящее по кривой. \en An edge passing along a curve. 
        CurveEdge    = 202,  ///< \ru Ребро, проходящее по кривой пересечения поверхностей. \en An edge passing along a surface intersection curve. 
        OrientedEdge = 203,  ///< \ru Ориентированное ребро. \en Oriented edge. 
      
        Loop         = 301,  ///< \ru Цикл. \en A loop. 
      
        Face         = 401,  ///< \ru Грань. \en A face. \n
      
        FaceShell    = 501,  ///< \ru Множество граней. \en A set of faces. \n
      
        FreeItem     = 600,  ///< \ru Тип для объектов, созданных пользователем. \en Type for the user-defined objects.
      
      };

      declare enum SurfaceProlongType {
        None                  = 0x00,  // 00000000  ///< \ru Не продлевать. \en Don't prolong. 
        Planar                = 0x01,  // 00000001  ///< \ru Плоские поверхности. \en Planar surfaces. 
        RevolutionAxis        = 0x02,  // 00000010  ///< \ru Поверхности вращения (вдоль оси). \en Revolution surfaces (along axis). 
        RevolutionAngle       = 0x04,  // 00000100  ///< \ru Поверхности вращения (по углу). \en Revolution surfaces (by angle). 
        Revolution            = 0x06,  // 00000110  ///< \ru Поверхности вращения. \en Revolution surfaces. 
        ExtrusionGeneratrix   = 0x08,  // 00001000  ///< \ru Поверхности выдавливания (по образующей). \en Extrusion surfaces (by generatrix).
        ExtrusionDistance     = 0x10,  // 00010000  ///< \ru Поверхности выдавливания (по расстоянию). \en Extrusion surfaces (by distance).
        Extrusion             = 0x18,  // 00011000  ///< \ru Поверхности выдавливания. \en Extrusion surfaces.
        Contour               = 0x20,  // 00100000  ///< \ru Продление секущего контура. \en Extension of the cutter contour.
        RuledAlongGeneratrix  = 0x40,  // 01000000  ///< \ru Линейчатая поверхность (вдоль образующей). \en Ruled Surface (along generatrix).
        RuledAcrossGeneratrix = 0x80,  // 10000000  ///< \ru Линейчатая поверхность (поперек образующей). \en Ruled Surface (across generatrix).
        Ruled                 = 0xC0,  // 11000000  ///< \ru Линейчатая поверхность. \en Ruled Surface.
      };

      declare enum SenseValue {
        BOTH = 0,  ///< \ru Оба направления (неориентированный). \en Both directions (nonoriented). 
        FORWARD,   ///< \ru Прямое направление. \en Forward direction. 
        BACK,      ///< \ru Обратное направление. \en Backward direction. 
    };

    declare enum RefType {
        RefItem = 0,  ///< \ru Некоторый объект. \en Some object. 
        PlaneItem,    ///< \ru Двумерный геометрически объект. \en Two-dimensional geometric object. 
        SpaceItem,    ///< \ru Трехмерный геометрический объект. \en Three-dimensional geometric object. 
        TopItem,      ///< \ru Топологический объект. \en A topological object. 
        Creator,      ///< \ru Строитель объекта. \en Object constructor 
        Attribute,    ///< \ru Атрибут объекта. \en Attribute of an object.  
        Primitive,    ///< \ru Элемент полигонального объекта. \en Element of polygonal object.
        // \ru В конец можно добавлять новые нужные \en It is possible to add new necessary ones to the end 
    };

    declare enum ConvResType {
        Success = 0,           ///< \ru Успешное завершение.                 \en Success.
        Error,                 ///< \ru Ошибка в процессе конвертирования.   \en Error.
        UserCanceled,          ///< \ru Процесс прерван пользователем.       \en Process interrupted by user.
        NoBody,                ///< \ru Не найдено тел.                      \en No solids found.
        NoObjects,             ///< \ru Не найдено объектов.                 \en No objects found.
        FileOpenError,         ///< \ru Ошибка открытия файла.               \en File open error.
        FileWriteError,        ///< \ru Ошибка записи файла.                 \en File write error.
        FileDeleteError,       ///< \ru Ошибка удаления файла.               \en Could not delete file.
        ImpossibleReadAssembly,///< \ru Не поддерживает работу со сборками.  \en Assemblies are not supported.
        LicenseNotFound,       ///< \ru Ошибка получения лицензии.           \en License check failure.
        NotEnoughMemory,       ///< \ru Недостаточно памяти.                 \en Not enough memory.
        UnknownExtension       ///< \ru Неизвестное расширение файла.        \en Unknown file extenstion.
      };

      declare enum MLTipType {
        UndefTip,    ///< \ru Законцовки нет. \en No tip. 
        LinearTip,   ///< \ru Линейная законцовка. \en Linear tip. 
        ArcTip,      ///< \ru Дуговая законцовка. \en Arc tip. 
        PolylineTip, ///< \ru Ломаная законцовка. \en Polyline tip. 
        ObliqueTip,  ///< \ru Наклонная законцовка. \en Inclined tip. 
        // \ru ДОБАВЛЕНИЕ ТОЛЬКО В КОНЕЦ!!! \en ADDITION ONLY TO THE END!!! 
      };     

      declare enum SweptWay {
        scalarValue = -2, ///< \ru Выдавить на заданную глубину / вращать на заданный угол. \en Extrude to a given depth / rotate by a given angle.
        shell       = -1, ///< \ru До ближайшего объекта (тела). \en To the nearest object (solid).
        surface     =  0, ///< \ru До поверхности. \en To the surface.
      };

      declare enum MatingType {
        // \ru Не менять номера, тип пишется и читается, новые добавлять в конец \en Do not change the numbers. Type is written and read. Append new types to the end 
        None     = -1, ///< \ru Без сопряжений. \en Without conjugations. 
        Position =  0, ///< \ru Соединение по позиции      (эквивалентно tt_SmoothG0). \en The connection by the position (equivalent to tt_SmoothG0). 
        Tangent  =  1, ///< \ru Соединение по касательной  (эквивалентно tt_SmoothG1). \en Tangential connection  (equivalent to tt_SmoothG1). 
        Normal   =  2, ///< \ru Соединение перпендикулярно (эквивалентно tt_SmoothG1). \en Perpendicular connection (equivalent to tt_SmoothG1). 
        SmoothG2 =  3, ///< \ru Гладкое соединение по первой производной касательной (по кривизне). \en The smooth connection by the first derivative of the tangent (the curvature). 
        SmoothG3 =  4, ///< \ru Гладкое сопряжение по второй производной касательной.               \en The smooth conjugation by the second derivative of the tangent.                    //-V112 
      };
    
    declare enum ExtensionType {
        same = 0,           ///< \ru По той же поверхности. \en Along the same surface.
        tangent,            ///< \ru По касательной к краю. \en Along tangent to the edge.
        direction,          ///< \ru По направлению. \en Along the direction.
    };
    
    declare enum ExtensionWay {
        distance = -2,      ///< \ru Продолжить на расстояние. \en Prolong on the distance.
        vertex = -1,      ///< \ru Продолжить до вершины. \en Prolong to the vertex.
        shell = 0,      ///< \ru Продолжить до оболочки. \en Prolong to the shell.
    };
    
    declare enum LateralKind {
        normal = 0,         ///< \ru По нормали к кромке. \en Along the normal to boundary.
        prolong,            ///< \ru Продлить исходные рёбра. \en Extend the initial edges.
    };


    declare enum HoleType {
        BorerValues = 0, ///< \ru Отверстие. \en Hole.
        PocketValues = 1, ///< \ru Карман. \en Pocket.
        SlotValues = 2, ///< \ru Паз. \en Slot.
    }

    declare enum SlotType {
        //       ________         *
        //       |      |         *
        //       +------+         *
        //        \    /          *
        //          --            *
        BallEnd = 0,  ///< \ru Цилиндрический в донной части. \en Cylindrical in the bottom part.
        //       ________         *
        //       |      |         *
        //       |      |         *
        //       |      |         *
        //       +------+         *
        Rectangular = 1,  ///< \ru Прямоугольный. \en Rectangular.
        //       ________         *
        //       |      |         *
        //    +--+------+--+      *
        //    |            |      *
        //    +------------+      *
        TShaped = 2,  ///< \ru T-образный. \en T-shaped.
        //       ________         *
        //      /        \        *
        //     /          \       *
        //    /            \      *
        //   +--------------+     *
        DoveTail = 3,  ///< \ru Ласточкин хвост. \en Dovetail
    };

    declare enum ChangedType {
        Unchanged   = 0x0000, ///< \ru Без изменений. \en Unchanged. 
        Modified    = 0x0001, ///< \ru Изменен. \en Modified. 
        Created     = 0x0002, ///< \ru Создан новый. \en Created (new). 
        Transformed = 0x0004, ///< \ru Трансформирован. \en Transformed. 
        Reoriented  = 0x0008, ///< \ru Переориентирован. \en Reoriented. 
        Deleted     = 0x0010, ///< \ru Удален (элемент объекта или связь). \en Deleted (object's element or link). 
        Truncated   = 0x0020, ///< \ru Разрезан, усечен, продлен. \en Cut, truncated or extended.
        Merged      = 0x0040, ///< \ru Объединен или сшито. \en Merged or sewn (stitched).
        Replaced    = 0x0080, ///< \ru Заменен. \en Replaced. 
        Added       = 0x0100, ///< \ru Добавлен или вставлен (элемент объекта). \en Added or inserted (object's element). 
        Renamed     = 0x0200, ///< \ru Переименован. \en Renamed.
    };

}