#include <iostream>
#include <sstream>

#include "../include/Face.h"

/**
 * There are attributes of the surface of the face that are useful; however, returning
 * a reference to the surface isn't safe. This is maybe unneccessary; I'm still trying to
 * figure out a way to determine if a face is a fillet.
 */

Napi::Value Face::IsA(const Napi::CallbackInfo &info)
{
    const MbSurface & surface = this->_underlying->GetSurface();
    // const MbSurface & surface = this->_underlying->GetSurface().GetBasisSurface();
    Napi::Env env = info.Env();
    MbeSpaceType _result = surface.Type();
    Napi::Value _to;
    _to = Napi::Number::New(env, _result);
    return _to;
}
