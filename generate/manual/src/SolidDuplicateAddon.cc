#pragma once

#include "../include/_SolidDuplicate.h"

#include <sstream>
#include <stdio.h>

Napi::Value _SolidDuplicate::GetBuffers(const Napi::CallbackInfo &info)
{
    SolidDuplicate *underlying = this->_underlying;

    const size_t count = underlying->GetCopy()->GetFacesCount();

    Napi::Env env = info.Env();

    Napi::ArrayBuffer oBuf = Napi::ArrayBuffer::New(env, (void *)underlying->originalFaceIds, count * sizeof(uint64_t));
    Napi::BigInt64Array oArray = Napi::BigInt64Array::New(env, count, oBuf, 0);

    Napi::ArrayBuffer cBuf = Napi::ArrayBuffer::New(env, (void *)underlying->copyFaceIds, count * sizeof(uint64_t));
    Napi::BigInt64Array cArray = Napi::BigInt64Array::New(env, count, cBuf, 0);

    Napi::Object result = Napi::Object::New(env);
    result.Set(Napi::String::New(env, "originalFaceIds"), oArray);
    result.Set(Napi::String::New(env, "copyFaceIds"), cArray);

    return result;
}