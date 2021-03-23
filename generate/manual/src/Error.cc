#include "../include/Error.h"
#include "mb_operation_result.h"

const char* Error::GetSolidErrorResId( uint solidError )
{
  switch ( solidError )
  {
    case rt_Success:                     // Нормальная работа
      return RT_OK;
    case rt_Empty:
      return RT_EMPTY;              // Пустой
    case rt_ToManyAxis:
      return RT_TOMANYAXIS;         // Слишком много осей
    case rt_ToFewAxis:
      return RT_TOFEWAXIS;          // Не хватает осей
    case rt_ToManyContours:
      return RT_TOMANYCONTOURS;     // Слишком много контуров
    case rt_Stars:
      return RT_STARS;              // Есть "звезда"
    case rt_SelfIntersection:
      return RT_SELFINTERSECTION;   // Самопересечение
    case rt_Intersection:
      return RT_INTERSECTION;       // Пересечение контуров
    case rt_NoIntersectSolid:       // Контур не пересекает поверхность тела
      return RT_NO_INTERSECTION_SOLID;
    case rt_NoIntersectSection:     // Образующий контур не пересекает сечения (для операции построения тела по сечениям)
      return RT_NO_INTERSECT_SECTION;  // Образующий контур не пересекает сечения (для операции построения тела по сечениям)
    case rt_MustBeClosed:
      return RT_MUST_BE_CLOSED;     // Должен быть замкнут
    case rt_MustBeOpen:
      return RT_MUST_BE_OPEN;       // Должен быть разомкнут
    case rt_AxisIntersection:
      return RT_AXIS_INTERSECTION;  // Пересечение с осью
    case rt_InvalidType:
      return RT_INVALID_TYPE;       // Неподходящий тип кривой

    // Типы ошибок
    case rt_NoSequenceCurveAndSections:  // Не последовательное расположение сечений вдоль кривой (для операции построения тела по сечениям)
      return RT_NO_SEQUENCE_CURVE_AND_SECTIONS;  // Не последовательное расположение сечений вдоль кривой (для операции построения тела по сечениям)
    case rt_MultiSolid:             // Тело состоит из отдельных частей
      return RT_MULTISOLID;
    case rt_CurveError:             // Ошибочная кривая
      return RT_CURVEERROR;
    case rt_ContourError:           // Ошибочный контур
      return RT_CONTOURERROR;
    case rt_SurfaceError:           // Ошибочная поверхность
      return RT_SURFACEERROR;
    case rt_SolidError:             // Ошибочное тело
      return RT_SOLIDERROR;
    case rt_ParameterError:         // Ошибочный параметр
      return RT_PARAMETERERROR;
    case rt_ThicknessError:         // Неверно задана толщина
       return RT_THICKNESSERROR;
    case rt_SelfIntersect:          // Объект самопересекается
      return RT_SELFINTERSECT;
    case rt_SelfIntWhenExtended:    // Самопересечение в продолжении контура
      return RT_SELFINTWHENEXTENDED;
    case rt_Intersect:              // Объекты пересекаются
      return RT_INTERSECT;
    case rt_NoIntersect:            // Объекты не пересекаются
      return RT_NOINTERSECT;
    case rt_OffsetIntersectError:         // Объекты пересекается с ошибкой
      return RT_ERRORINTERSECT;
    case rt_BooleanError:           // Ошибка в булевой операции
      return RT_BOOLEANERROR;
    case rt_NoEdges:                // Ребра не найдены
      return RT_NOEDGES;
    case rt_PrepareError:           // Ошибка при подготовке операции
      return RT_PREPAREERROR;
    case rt_ChamferError:           // Ошибка при создании фаски ребра
      return RT_CHAMFERERROR;
    case rt_FilletError:            // Ошибка при скруглении ребра
      return RT_FILLETERROR;
    case rt_ChamferSurfaceError:    // Ошибка при создании поверхности фаски ребра
      return RT_CHAMFER_SURFACE_ERROR;
    case rt_FilletSurfaceError:     // Ошибка при создании поверхности скругления ребра
      return RT_FILLET_SURFACE_ERROR;
    case rt_TooLargeChamfer:        // Слишком большые катеты фаски
      return RT_TOO_LARGE_CHAMFER;
    case rt_TooLargeFillet:         // Слишком большой радиус скругления
      return RT_TOO_LARGE_FILLET;
    case rt_SemiChamfer:           // Фаски построены на для всех ребер
      return RT_SEMI_CHAMFER;
    case rt_SemiFillet:            // Скруглены не все ребра
      return RT_SEMI_FILLET;
    case rt_CuttingError :          // Ошибка резки поверхностью
      return RT_CUTTINGERROR;
    case rt_ThinError:              // Ошибка при создании тонкостенного тела
      return RT_THINERROR;
    case rt_RibError :              // Ошибка постановки ребра жесткости
      return RT_RIBERROR;
    case rt_DraftError:             // Неизвестная ошибка уклона граней тела
      return RT_DRAFTERROR;
    case rt_CutBySilhouetteError:   // Ошибка разреза силуэтной линией.
      return RT_CUTBYSILHOUETTE;
    case rt_SplitWireNotIntersectFace:  // Контур не пересекает ни одну из граней или совпадает с кромкой грани(MA 17.07.2001)
      return RT_SPLIT_WIRE_NOT_INTERSECT_FACE;

    case rt_SplitWireNotSplitFace:      // Контур не разбивает
      return RT_SPLIT_WIRE_NOT_SPLIT_FACE;
    case rt_NotAllContoursUsed: // Not all contours or curves were used
      return RT_NOT_ALL_ITEMS_WERE_USED;

    case rt_Error:                      // Ошибка
    default :
      return RT_ERROR_;
  }
} // GetSolidErrorResId