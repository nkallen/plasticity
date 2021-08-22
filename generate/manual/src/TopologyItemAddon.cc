#include <iostream>
#include <sstream>

#include "../include/Face.h"
#include "../include/Edge.h"

Napi::Value cast(MbTopologyItem * _underlying, const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() != 1)
    {
        Napi::Error::New(env, "Expecting 1 parameters").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    if (!info[0].IsNumber())
    {
        Napi::Error::New(env, "Parameter 0 must be number").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    const uint isa = info[0].ToNumber().Uint32Value();
    if (_underlying->IsA() != isa)
    {
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << " but trying to cast to " << isa << "\n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }

    switch (isa)
    {
    case tt_Face:
        return Face::NewInstance(env, (MbFace *)(_underlying));
    }
}

Napi::Value TopologyItem::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}
