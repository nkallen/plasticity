#include "../include/Name.h"
#include "../include/CurveEdge.h"
#include "../include/Face.h"
#include "../include/Solid.h"
#include "../include/Grid.h"

Napi::Value Grid::GetBuffers_async(const Napi::CallbackInfo &info)
{
    return info.Env().Undefined();
}

Napi::Value Grid::GetBuffers(const Napi::CallbackInfo &info)
{
    MbGrid *underlying = this->_underlying;

    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    Napi::ArrayBuffer tbuf = Napi::ArrayBuffer::New(env, (void *)underlying->GetTrianglesAddr(), sizeof(MbTriangle) * underlying->TrianglesCount());
    Napi::Uint32Array index = Napi::Uint32Array::New(env, 3 * underlying->TrianglesCount(), tbuf, 0);
    Napi::ArrayBuffer pbuf = Napi::ArrayBuffer::New(env, (void *)underlying->GetFloatPointsAddr(), sizeof(MbFloatPoint3D) * underlying->PointsCount());
    Napi::Float32Array position = Napi::Float32Array::New(env, 3 * underlying->PointsCount(), pbuf, 0);
    Napi::ArrayBuffer nbuf = Napi::ArrayBuffer::New(env, (void *)underlying->GetFloatNormalsAddr(), sizeof(MbFloatPoint3D) * underlying->PointsCount());
    Napi::Float32Array normal = Napi::Float32Array::New(env, 3 * underlying->NormalsCount(), nbuf, 0);

    result.Set(Napi::String::New(env, "index"), index);
    result.Set(Napi::String::New(env, "position"), position);
    result.Set(Napi::String::New(env, "normal"), normal);

    return result;
}

Napi::Object getBuffer(const Napi::CallbackInfo &info, const size_t i, MbGrid *grid)
{
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    Napi::ArrayBuffer tbuf = Napi::ArrayBuffer::New(env, (void *)grid->GetTrianglesAddr(), sizeof(MbTriangle) * grid->TrianglesCount());
    Napi::Uint32Array index = Napi::Uint32Array::New(env, 3 * grid->TrianglesCount(), tbuf, 0);
    Napi::ArrayBuffer pbuf = Napi::ArrayBuffer::New(env, (void *)grid->GetFloatPointsAddr(), sizeof(MbFloatPoint3D) * grid->PointsCount());
    Napi::Float32Array position = Napi::Float32Array::New(env, 3 * grid->PointsCount(), pbuf, 0);
    Napi::ArrayBuffer nbuf = Napi::ArrayBuffer::New(env, (void *)grid->GetFloatNormalsAddr(), sizeof(MbFloatPoint3D) * grid->PointsCount());
    Napi::Float32Array normal = Napi::Float32Array::New(env, 3 * grid->NormalsCount(), nbuf, 0);

    // TODO: test if Napi::String::New is expensive
    result.Set(Napi::String::New(env, "index"), index);
    result.Set(Napi::String::New(env, "position"), position);
    result.Set(Napi::String::New(env, "normal"), normal);

    result.Set(Napi::String::New(env, "style"), Napi::Number::New(env, grid->GetStyle()));
    result.Set(Napi::String::New(env, "simpleName"), Napi::Number::New(env, grid->GetPrimitiveName()));
    result.Set(Napi::String::New(env, "i"), Napi::Number::New(env, i));
    result.Set(Napi::String::New(env, "grid"), Grid::NewInstance(env, grid));

    const MbTopItem *top = grid->TopItem();
    if (top != NULL)
    {
        MbFace *face = (MbFace *)top;
        result.Set(Napi::String::New(env, "model"), Face::NewInstance(env, face));
    }

    return result;
}

Napi::Value Mesh::GetBuffers_async(const Napi::CallbackInfo &info)
{
    return info.Env().Undefined();
}

Napi::Value Mesh::GetBuffers(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::Array result = Napi::Array::New(env);
    MbMesh *mesh = _underlying;
    size_t count = mesh->GridsCount();
    if (count > 0)
    {
        for (size_t i = 0, j = 0, iCount = mesh->GridsCount(); i < iCount; i++)
        {
            MbGrid *grid = mesh->SetGrid(i);
            if (grid != NULL)
            {
                if (!grid->IsVisible())
                    continue;
                result[j++] = getBuffer(info, i, grid);
            }
        }
    }
    return result;
}

Napi::Value Mesh::GetApexes_async(const Napi::CallbackInfo &info)
{
    return info.Env().Undefined();
}

Napi::Value Mesh::GetApexes(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    MbMesh *mesh = _underlying;
    size_t count = mesh->ApexesCount();
    Napi::ArrayBuffer buf = Napi::ArrayBuffer::New(env, 4 * 3 * count);
    Napi::Float32Array result = Napi::Float32Array::New(env, 3 * count, buf, 0);
    if (count > 0)
    {
        MbCartPoint3D p;
        size_t i = 0;
        for (size_t k = 0; k < count; k++)
        {
            const MbApex3D *apex = mesh->GetApex(k);
            if (apex == NULL)
                continue;
            if (!apex->IsVisible())
                continue;

            apex->GetPoint(p);
            result[i] = (float)p.x;
            result[++i] = (float)p.y;
            result[++i] = (float)p.z;
        }
    }
    return result;
}

Napi::Value Mesh::GetEdges_async(const Napi::CallbackInfo &info)
{
    return info.Env().Undefined();
}

Napi::Value Mesh::GetEdges(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    bool outlinesOnly = false;
    if (info.Length() == 1 && info[0].IsBoolean())
        outlinesOnly = info[0].ToBoolean();

    MbMesh *mesh = _underlying;
    size_t count = mesh->PolygonsCount();
    Napi::Array result = Napi::Array::New(env);
    if (count > 0)
    {
        MbCartPoint3D p;
        size_t j = 0, edgeIndex = 0;
        for (size_t k = 0; k < count; k++)
        {
            Napi::Object jsInfo = Napi::Object::New(env);

            const MbPolygon3D *polygon = mesh->GetPolygon(k);
            if (polygon == NULL)
                continue;

            if (outlinesOnly)
            {
                const MbTopItem *item = polygon->TopItem();
                if (item == NULL)
                    continue;

                if (item->IsA() != tt_CurveEdge)
                    continue;

                edgeIndex++;

                if (!polygon->IsVisible())
                    continue;

                MbCurveEdge *edge = (MbCurveEdge *)item;

                if (edge->IsPole())
                    continue;
                if (edge->IsSeam())
                    continue;

                jsInfo.Set(Napi::String::New(env, "simpleName"), Napi::Number::New(env, edge->GetNameHash()));
            }
            else
            {
                if (!polygon->IsVisible())
                    continue;
            }

            size_t pointsCnt = polygon->Count();
            Napi::ArrayBuffer buf = Napi::ArrayBuffer::New(env, 4 * 3 * pointsCnt);
            Napi::Float32Array line = Napi::Float32Array::New(env, 3 * pointsCnt, buf, 0);
            size_t i = 0;
            // FIXME: benchmark and see if removing the copy would help
            for (size_t n = 0; n < pointsCnt; n++)
            {
                polygon->GetPoint(n, p);
                line[i++] = (float)p.x;
                line[i++] = (float)p.y;
                line[i++] = (float)p.z;
            }
            jsInfo.Set(Napi::String::New(env, "position"), line);
            result[j++] = jsInfo;
        }
    }
    return result;
}

void AutoReg(MbAutoRegDuplicate *&autoReg, MbRegDuplicate *&iReg)
{
    iReg = NULL;
    autoReg = new MbAutoRegDuplicate(iReg);
}