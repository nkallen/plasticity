#include <iostream>
#include <sstream>

#include "../include/Model.h"
#include "../include/Solid.h"
#include "../include/ActionSolid.h"

Napi::Value Model::writeItems(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    membuf memBuf;
    writer::writer_ptr wrt = writer::CreateMemWriter(memBuf, 0);
    ::WriteModelItems(*wrt, *_underlying);
    memBuf.closeBuff();

    uint64 bufsize = memBuf.getMemLen();
    Napi::ArrayBuffer result = Napi::ArrayBuffer::New(env, bufsize);
    const char *buffer = (const char *)result.Data();
    memBuf.toMemory(buffer, bufsize);
    return result;
}

inline MbSolid *CreateSampleSphere(double radius, double xpos)
{
    SArray<MbCartPoint3D> points(3, 1);
    points.push_back(MbCartPoint3D(xpos, 0.0, 0.0));
    points.push_back(MbCartPoint3D(xpos, 0.0, radius));
    points.push_back(MbCartPoint3D(xpos + radius, 0.0, 0.0));
    MbSNameMaker operNames(ct_ElementarySolid, MbSNameMaker::i_SideNone, 0);

    MbSolid *sphere = c3d_null;
    ::ElementarySolid(points, ElementaryShellType::et_Sphere, operNames, sphere);
    PRECONDITION(sphere);
    return sphere;
}

Napi::Value Model::readItems(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() != 1)
    {
        Napi::Error::New(env, "Expecting 1 parameters").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    if (!info[0].IsArrayBuffer())
    {
        Napi::Error::New(env, "Parameter 0 must be array buffer").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer(env, info[0]);

    MbModel *model = new MbModel();
    membuf memBuf;

    char * buffer = (char *)arrayBuffer.Data();
    memBuf.fromMemory(buffer);

    reader::reader_ptr rdr = reader::CreateMemReader(memBuf, 0);
    ::ReadModelItems(*rdr, *model);

    return Model::NewInstance(env, model);
}
