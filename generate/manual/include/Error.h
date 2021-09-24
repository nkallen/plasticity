#include "tool_cstring.h"

#ifndef ERROR_H
#define ERROR_H

typedef unsigned int       uint;

#define _T(x)      x

// \ru сообщения эскиза о причинах провала построения контуров \en messages of a sketch about reasons of contours creation failure
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_OK                                   _T("") // sf_Ok,
#else
#define  RT_OK                                   _T("") // sf_Ok,
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_EMPTY                                _T("Пустой эскиз. ")
#else
#define  RT_EMPTY                                _T("Empty sketch. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_TOMANYAXIS                           _T("Слишком много осей. ")
#else
#define  RT_TOMANYAXIS                           _T("Too many axes. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_TOFEWAXIS                            _T("В эскизе должна присутствовать строго одна ось. ")
#else
#define  RT_TOFEWAXIS                            _T("There should be exactly one axis. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_TOMANYCONTOURS                       _T("В эскизе должен быть строго один контур. ")
#else
#define  RT_TOMANYCONTOURS                       _T("There should be exactly one contour. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_STARS                                _T("Контуры не должны пересекаться и/или иметь общие точки. ")//"Есть 'звезда'. "
#else
#define  RT_STARS                                _T("Contours should not intersect each other and/or have common points. ")//"There is a 'star'. "
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SELFINTERSECTION                     _T("Самопересечение контура. ")
#else
#define  RT_SELFINTERSECTION                     _T("Contour self-intersection. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NOTCLOSEDSCETCH                      _T("Эскиз замкнут. ")
#else
#define  RT_NOTCLOSEDSCETCH                      _T("The sketch is closed. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NOTSECTIONCUBE                       _T("Эскиз не пересекает деталь. ")
#else
#define  RT_NOTSECTIONCUBE                       _T("The sketch does not intersect the detail. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_INTERSECTION                         _T("Пересечение контуров. ")
#else
#define  RT_INTERSECTION                         _T("Contours intersection. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CONTOUR_GAB_ERROR                    _T("В контуре есть разрывы между сегментами. ")
#else
#define  RT_CONTOUR_GAB_ERROR                    _T("There are gaps between the segments in the contour. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CONTOUR_SEGMENTS_OVERLAP_ERROR       _T("В контуре есть наложения сегментов. ")
#else
#define  RT_CONTOUR_SEGMENTS_OVERLAP_ERROR       _T("There are segment overlays in the contour. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SKETCH_CHECK                         _T("Проверка эскиза ")
#else
#define  RT_SKETCH_CHECK                         _T("Sketch check ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NO_INTERSECTION_SOLID                _T("Нет пересечения образующего контура с телом")
#else
#define  RT_NO_INTERSECTION_SOLID                _T("There is no intersection of generating contour with the solid")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_LIBNOTFOUND                          _T("Фрагмент не найден в библиотеке. ")
#else
#define  RT_LIBNOTFOUND                          _T("The fragment is not found in the library. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_MUST_BE_CLOSED                       _T("Все контура должны быть замкнуты.")
#else
#define  RT_MUST_BE_CLOSED                       _T("All the contours should be closed.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_MUST_BE_OPEN                         _T("Все контура должны быть разомкнуты. ")
#else
#define  RT_MUST_BE_OPEN                         _T("All the contours should be open. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_AXIS_INTERSECTION                    _T("Ось пересекает контур. ")
#else
#define  RT_AXIS_INTERSECTION                    _T("The axis intersects the contour. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_ERROR_                               _T("Невозможно выполнить операцию. ") //"Неизвестная ошибка. "
#else
#define  RT_ERROR_                               _T("The operation cannot be done. ") //"Unknown error. "
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NO_INTERSECT_SECTION                 _T("Осевая линия не пересекает сечения")
#else
#define  RT_NO_INTERSECT_SECTION                 _T("Axial line does not intersect sections")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_INVALID_TYPE                         _T("Тип кривой не подходит для данной операции")
#else
#define  RT_INVALID_TYPE                         _T("The curve type does not suit for the this operation")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_ACCURACY                             _T("Достигнутая точность аппроксимации")
#else
#define  RT_ACCURACY                             _T("Attained approximation accuracy")
#endif

// \ru Cообщения о причинах отказа построения тела \en Messages about the reasons of solid construction failure
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_MULTISOLID                           _T("Тело состоит из отдельных частей. ")
#else
#define  RT_MULTISOLID                           _T("The solid consists of separate parts. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_MULTISOLID_CHECK                     _T("Проверка разделения тела на части")
#else
#define  RT_MULTISOLID_CHECK                     _T("Parts splitting check")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_MULTISOLID_SPLIT                     _T("Выполнение разделения тела на части")
#else
#define  RT_MULTISOLID_SPLIT                     _T("Parts splitting process")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CURVEERROR                           _T("Ошибочная кривая. ")
#else
#define  RT_CURVEERROR                           _T("Invalid curve. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CONTOURERROR                         _T("Ошибочный контур. ")
#else
#define  RT_CONTOURERROR                         _T("Invalid contour. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SURFACEERROR                         _T("Ошибочная поверхность. ")
#else
#define  RT_SURFACEERROR                         _T("Invalid surface. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SOLIDERROR                           _T("Ошибочное тело. ")
#else
#define  RT_SOLIDERROR                           _T("Invalid solid. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_PARAMETERERROR                       _T("Ошибочный параметр. ")
#else
#define  RT_PARAMETERERROR                       _T("Invalid parameter. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_THICKNESSERROR                       _T("Неправильно задана толщина.")
#else
#define  RT_THICKNESSERROR                       _T("Incorrectly specified thickness.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SELFINTERSECT                        _T("Объект самопересекается. ")
#else
#define  RT_SELFINTERSECT                        _T("The object has self-intersections. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SELFINTWHENEXTENDED                  _T("Объект самопересекается на продолжении. ") 
#else
#define  RT_SELFINTWHENEXTENDED                  _T("The object has self-intersections on the extension.") // for a rib
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_INTERSECT                            _T("Объекты пересекаются.")
#else
#define  RT_INTERSECT                            _T("The objects have intersections.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NOINTERSECT                          _T("Объекты не пересекаются.")
#else
#define  RT_NOINTERSECT                          _T("The objects have no intersections.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NO_SEQUENCE_CURVE_AND_SECTIONS       _T("Не послед.расположение сечений вдоль кривой.")
#else
#define  RT_NO_SEQUENCE_CURVE_AND_SECTIONS       _T("Nonsequential arrangement of sections along the curve.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_ERRORINTERSECT                       _T("Объекты пересекается с ошибкой.")
#else
#define  RT_ERRORINTERSECT                       _T("Objects intersection error.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_BOOLEANERROR                         _T("Ошибка в булевой операции.")
#else
#define  RT_BOOLEANERROR                         _T("Error in the Boolean operation.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NOEDGES                              _T("Ребра не найдены. ")
#else
#define  RT_NOEDGES                              _T("Edges not found. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_PREPAREERROR                         _T("Ошибка при подготовке операции. ")
#else
#define  RT_PREPAREERROR                         _T("Error while preparing the operation. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CHAMFERERROR                         _T("Ошибка при создании фаски ребра. ")
#else
#define  RT_CHAMFERERROR                         _T("Error while creation an edge chamfer. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_FILLETERROR                          _T("Ошибка при скруглении ребра. ")
#else
#define  RT_FILLETERROR                          _T("Error while filleting an edge. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CHAMFER_SURFACE_ERROR                _T("Ошибка при создании поверхности фаски ребра. ")
#else
#define  RT_CHAMFER_SURFACE_ERROR                _T("Error while creation an edge chamfer surface. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_FILLET_SURFACE_ERROR                 _T("Ошибка при создании поверхности скругления ребра. ")
#else
#define  RT_FILLET_SURFACE_ERROR                 _T("Error while creating an edge fillet surface. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_TOO_LARGE_CHAMFER                    _T("Слишком большые катеты фаски. ")
#else
#define  RT_TOO_LARGE_CHAMFER                    _T("Too large cathetus of a chamfer. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_TOO_LARGE_FILLET                     _T("Слишком большой радиус скругления. ")
#else
#define  RT_TOO_LARGE_FILLET                     _T("Too large fillet radius. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SEMI_CHAMFER                         _T("Фаски построены на для всех ребер. ")
#else
#define  RT_SEMI_CHAMFER                         _T("Chamfers created not for all edges. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SEMI_FILLET                          _T("Скруглены не все ребра. ")
#else
#define  RT_SEMI_FILLET                          _T("Not all the edges are filleted. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CUTTINGERROR                         _T("Ошибка резки поверхностью. ")
#else
#define  RT_CUTTINGERROR                         _T("Error of cutting by surface. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_THINERROR                            _T("Ошибка при создании тонкостенного тела. ")
#else
#define  RT_THINERROR                            _T("Error of a thin-walled solid creation. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_RIBERROR                             _T("Ошибка постановки ребра жесткости. ")
#else
#define  RT_RIBERROR                             _T("Error of a rib construction. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_DRAFTERROR                           _T("Ошибка уклона граней тела")
#else
#define  RT_DRAFTERROR                           _T("Error of solid's faces drafting ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CUTBYSILHOUETTE                       _T("Ошибка разреза силуэтной линией. ")
#else
#define  RT_CUTBYSILHOUETTE                       _T("Error of cutting by silhouette curve. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_OPENFILEERROR                        _T(": файл не найден. ")
#else
#define  RT_OPENFILEERROR                        _T(": file not found. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_EMPTYDETAIL                          _T("Пустая деталь. ")
#else
#define  RT_EMPTYDETAIL                          _T("Empty detail. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_ERRORDETAIL                          _T(": деталь содержит ошибку. ")
#else
#define  RT_ERRORDETAIL                          _T(": the detail contains an error. ")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SPLIT_WIRE_NOT_SPLIT_FACE            _T("Линия разъема не пересекает грани")
#else
#define  RT_SPLIT_WIRE_NOT_SPLIT_FACE            _T("Parting line does not intersect faces")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SPLIT_WIRE_NOT_INTERSECT_FACE        _T("Линия разъема не разделяет грани")
#else
#define  RT_SPLIT_WIRE_NOT_INTERSECT_FACE        _T("Parting line does not split faces")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_COORIENTFACEERROR                    _T("Невозможно выставить согласованную ориентацию граней.")
#else
#define  RT_COORIENTFACEERROR                    _T("A consistent orientation of faces cannot be specified.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SOMEEDGESUNSTITCHED                  _T("Некоторые рёбра остались несшитыми.")
#else
#define  RT_SOMEEDGESUNSTITCHED                  _T("Some edges remained unstitched.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_OUTWARDORIENTERROR                   _T("Не удалось установить нормали граней наружу тела.")
#else
#define  RT_OUTWARDORIENTERROR                   _T("Failed to set the outer normals of faces.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NOEDGEWASSTITCHED                    _T("Не было сшито ни одного ребра.")
#else
#define  RT_NOEDGEWASSTITCHED                    _T("No edges were stitched.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_SEPARATEPARTSRESULT                  _T("После сшивки остались несвязанные между собой куски.")
#else
#define  RT_SEPARATEPARTSRESULT                  _T("Disconnected parts remained after stitching.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_CURVE_IS_NOT_ADDED                   _T("Кривая не добавлена.")
#else
#define  RT_CURVE_IS_NOT_ADDED                   _T("The curve is not added.")
#endif
#if defined ( __NATIVE_LANGUAGE__ )
#define  RT_NOT_ALL_ITEMS_WERE_USED              _T("Не все объекты были использованы.")
#else
#define  RT_NOT_ALL_ITEMS_WERE_USED              _T("Not all objects were used.")
#endif

class Error {
    public:
        static const char* GetSolidErrorResId( uint solidError );
};

#endif
