#include <iostream>
#include <sstream>

#include "alg_curve_envelope.h"
#include "mb_cross_point.h"

#include "../include/ActionCurve.h"
#include "../include/Contour.h"
#include "../include/Error.h"

MbResultType HandleEnvelopeContour(RPArray<MbCurve> &curveList, MbCartPoint &insidePnt, MbContour *&result);
void SwapCrossPoints(SArray<MbCrossPoint> &crossLeft, SArray<MbCrossPoint> &crossRight);
ptrdiff_t SelectCurveFromNode(const MbCurve *pSegment, const MbCurve *selectCurve, SArray<MbCrossPoint> &crossRight, int &sense);

//------------------------------------------------------------------------------
// Структура для запоминания шагов выбора контура для отката назад.
// Structure for storing the contour selection steps for rollback.
// ---
struct SaveStep
{
    const MbCurve *curve; // Селектированная кривая. // Selected curve.
    double tProj;         // Параметр в узле. // Parameter in the node.
    int sense;            // Признак совпадения направления. // // Sign of matching direction.
};

struct TangentDir {
  MbDirection dir;    // Вектор касательного направления. // The tangent direction vector.
  ptrdiff_t    idx;    // Индекс кривой. // Curve index.
  int          sense;  // Признак совпадения направления. // Sign of matching direction.
};

//------------------------------------------------------------------------------
// Построение контура по стрелке.
// Building a contour on the arrow.
// ---
MbResultType HandleEnvelopeContour(RPArray<MbCurve> &curveArray, MbCartPoint &insidePnt, MbContour *&result)
{
    List<MbCurve> curveList(false);

    ::AddRefItems(curveArray);
    for (ptrdiff_t j = 0; j < (ptrdiff_t)curveArray.Count(); j++)
        curveList.Add(curveArray[j]);

    // Нахождение ближайшей к точке кривой
    const MbCurve *selectCurve = FindNearestCurve(curveList, insidePnt);

    if (selectCurve == NULL)
        return rt_Empty;

    MbContour *contour = new MbContour();
    SArray<MbCrossPoint> crossRight; // Точки пересечения справа от точки проекции
    SArray<MbCrossPoint> cross;      // Точки пересечения

    // Ищем точки пересечения ближайшей кривой с остальными кривыми списка
    LIterator<MbCurve> firstCurve = curveList;
    IntersectWithAll(selectCurve, firstCurve, cross, true);

    // Функция нахождения первого сегмента контура и узла
    if (!BeginEnvelopeContour(insidePnt, selectCurve, cross, *contour, crossRight))
    {
        ::DeleteItem(contour);
        return rt_Empty;
    }

    const MbCurve *pSegment = contour->GetSegment(0); // Выдать начальный сегмент контура

    MbCartPoint startPnt(pSegment->GetLimitPoint(1));
    MbCartPoint stopPnt(pSegment->GetLimitPoint(2));

    SArray<MbCrossPoint> crossLeft(4, 4); // Точки пересечения слева от точки проекции     //-V112
    MbPointOnCurve<MbCurve> pOnAdd;
    MbCrossPoint pAdd;
    double tProj = selectCurve->PointProjection(startPnt);

    int sense = 1;
    int newSense;

    SaveStep stepTmp;
    SArray<SaveStep> steps; // Шаги для отката назад

    while (startPnt != stopPnt)
    {
        bool ok = true;
        bool forward = true; // Признак шага вперед

        // Выбрать подходящую кривую из узла
        ptrdiff_t indexCurve = SelectCurveFromNode(pSegment, selectCurve, crossRight, newSense);

        if (indexCurve >= 0 || indexCurve == -1)
        { // Нашли подходящую кривую
            if (indexCurve == -1)
            { // Шаг назад
                ptrdiff_t index = steps.MaxIndex();

                if (index >= 0)
                { // Сегментов контура больше одного
                    selectCurve = steps[index].curve;
                    tProj = steps[index].tProj;
                    sense = steps[index].sense;

                    ptrdiff_t countSeg = contour->GetSegmentsCount(); // Выдать количество сегментов контура

                    pSegment = contour->GetSegment(countSeg - 1); // Выдать сегмент контура по индексу

                    contour->DeleteSegment(countSeg - 1);         // Удалить сегмент контура по индексу
                    pSegment = contour->GetSegment(countSeg - 2); // Выдать сегмент контура по индексу

                    steps.RemoveInd(index); // Удаляем последний шаг

                    forward = false;
                }
                else
                    ok = false;
            }
            else
            {
                stepTmp.curve = selectCurve;
                stepTmp.tProj = tProj;
                stepTmp.sense = sense;

                steps.Add(stepTmp); // Запоминаем шаг

                selectCurve = crossRight[indexCurve].on2.curve;
                tProj = crossRight[indexCurve].on2.t;
                sense = newSense;
            }

            if (ok)
            {
                cross.Flush(); // Очистим множество точек пересечения

                // Ищем точки пересечения селектированной кривой с остальными кривыми списка
                IntersectWithAll(selectCurve, firstCurve, cross, true);

                if (selectCurve->IsBounded() && (!selectCurve->IsClosed()))
                {
                    // Ограниченная незамкнутая кривая
                    // Добавляем в множество граничные точки ограниченной кривой
                    pOnAdd.Init(selectCurve->GetTMin(), selectCurve);
                    pAdd.Init(selectCurve->GetLimitPoint(1), pOnAdd, pOnAdd);
                    cross.Add(pAdd);

                    pOnAdd.Init(selectCurve->GetTMax(), selectCurve);
                    pAdd.Init(selectCurve->GetLimitPoint(2), pOnAdd, pOnAdd);
                    cross.Add(pAdd);
                }

                // Удаляем из множества точки совпадающие с точкой проекции
                RemoveEquPoints(tProj, cross);

                if (cross.Count() > 0)
                {
                    // Сортировка точек пересечения по отношению точки проекции
                    SortCrossPoints(tProj, selectCurve, cross, crossLeft, crossRight);

                    if (sense != 1)
                    {
                        if (crossRight.Count() > 0)
                        {
                            if (fabs(crossRight[0].on1.t - tProj) > FLT_EPSILON)
                                SwapCrossPoints(crossLeft, crossRight); // Меняем местами узлы
                        }
                        else
                        {
                            SwapCrossPoints(crossLeft, crossRight); // Меняем местами узлы
                        }
                    }

                    if (crossRight.Count() > 0)
                    {
                        if (forward)
                            pSegment = contour->AddSegment(selectCurve,
                                                           tProj,
                                                           crossRight[0].on1.t, sense);

                        if (pSegment != NULL) // Новый сегмент может и не создаться
                            stopPnt = pSegment->GetLimitPoint(2);
                        else
                            stopPnt = startPnt; // ?
                    }
                    else
                        stopPnt = startPnt;
                }
                else
                    stopPnt = startPnt;
            }
            else
                stopPnt = startPnt;
        }
        else
            stopPnt = startPnt;
    }

    ::ReleaseItems(curveArray);

    result = contour;
    return rt_Success;
}

//------------------------------------------------------------------------------
// Перестановка узлов.
// The permutation of nodes.
// ---
void SwapCrossPoints(SArray<MbCrossPoint> &crossLeft,
                     SArray<MbCrossPoint> &crossRight)
{
    SArray<MbCrossPoint> tmp;
    tmp = crossLeft;
    crossLeft = crossRight;
    crossRight = tmp;
} // SwapCrossPoints

//------------------------------------------------------------------------------
// Выбрать подходящую кривую из узла.
// Choose the appropriate curve from the node.
// ---
ptrdiff_t SelectCurveFromNode(const MbCurve *pSegment,
                              const MbCurve *selectCurve,
                              SArray<MbCrossPoint> &crossRight,
                              int &sense)
{
    MbCrossPoint cross;

    double t2 = pSegment->GetTMax();
    pSegment->PointOn(t2, cross.p);
    cross.on2.curve = selectCurve;
    cross.on2.t = selectCurve->PointProjection(cross.p);

    cross.on1.curve = cross.on2.curve;
    cross.on1.t = cross.on2.t;

    crossRight.Add(cross); // Добавим кривую, по которой проходит сегмент

    ptrdiff_t count = crossRight.Count(); // Количество элементов в узле
    ptrdiff_t i;

    TangentDir tdTmp;
    SArray<TangentDir> tda; // Множество касательных направлений

    for (i = 0; i < count; i++)
    {
        const MbCurve *curve = crossRight[i].on2.curve;
        double tNode = crossRight[i].on2.t;

        tdTmp.dir = curve->Tangent(tNode);
        tdTmp.idx = i;
        tdTmp.sense = 1;

        if (curve->IsBounded())
        {
            // Ограниченная ( возможно усеченная ) кривая
            // Узел может попасть на граничную точку поэтому надо проверить
            // Это попадание

            if (fabs(tNode - curve->GetTMin()) < Math::paramRegion) // Узел совпадает с начальной точкой кривой
                tda.Add(tdTmp);
            else if (fabs(tNode - curve->GetTMax()) < Math::paramRegion)
            {
                // Узел совпадает с конечной точкой кривой
                tdTmp.dir.Invert(); // Меняем направление
                tdTmp.sense = -1;
                tda.Add(tdTmp);
            }
            else
            {
                // Узел находится "посередине" кривой
                // Необходимо учитывать два направления касательной в узле

                tda.Add(tdTmp);

                tdTmp.dir.Invert(); // Меняем направление
                tdTmp.sense = -1;
                tda.Add(tdTmp);
            }
        }
        else
        {
            tda.Add(tdTmp);

            tdTmp.dir.Invert(); // Меняем направление
            tdTmp.sense = -1;
            tda.Add(tdTmp);
        }
    }

    count = tda.Count(); // Количество направлений

    MbLineSegment ls;

    i = 0;
    bool goOn = true;
    do
    {
        MbCartPoint p2(cross.p.x + tda[i].dir.ax * 10, cross.p.y + tda[i].dir.ay * 10);
        ls.Init(cross.p, p2);

        // ptrdiff_t result = ExecuteChooseDirectionDlg(); // Выбор направления
        ptrdiff_t result = 0;

        switch (result)
        {
        case 0: // Направление подходит
            sense = tda[i].sense;
            goOn = false;
            return tda[i].idx;

        case -1: // Шаг назад
        case -2: // Отказ
            goOn = false;
            return result;
        }

        i++;
        if (i >= count)
            i = 0;

    } while (goOn);

    return false;
}