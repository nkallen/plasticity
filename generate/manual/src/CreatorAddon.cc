#include <iostream>
#include <sstream>

#include "../include/Creator.h"
#include "../include/ElementarySolid.h"
#include "../include/FilletSolid.h"

Napi::Value cast(MbCreator * _underlying, const Napi::CallbackInfo &info)
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

    _underlying->AddRef();
    switch (isa)
    {
    case ct_ElementarySolid:
        return ElementarySolid::NewInstance(env, (MbElementarySolid *)(_underlying));
    case ct_FilletSolid:
        return FilletSolid::NewInstance(env, (MbFilletSolid *)(_underlying));
    }
}

Napi::Value Creator::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}
