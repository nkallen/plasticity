#pragma once

#include "../include/_SolidDuplicate.h"

#include <sstream>
#include <stdio.h>

Napi::Value _SolidDuplicate::GetBuffers(const Napi::CallbackInfo &info)
{
    SolidDuplicate *underlying = this->_underlying;

    const size_t count = underlying->GetCopy()->GetFacesCount();

    Napi::Env env = info.Env();

    Napi::ArrayBuffer ofBuf = Napi::ArrayBuffer::New(env, (void *)underlying->originalFaceIds, count * sizeof(uint64_t));
    Napi::BigInt64Array ofArray = Napi::BigInt64Array::New(env, count, ofBuf, 0);

    Napi::ArrayBuffer cfBuf = Napi::ArrayBuffer::New(env, (void *)underlying->copyFaceIds, count * sizeof(uint64_t));
    Napi::BigInt64Array cfArray = Napi::BigInt64Array::New(env, count, cfBuf, 0);

    Napi::ArrayBuffer oeBuf = Napi::ArrayBuffer::New(env, (void *)underlying->copyEdgeIds, count * sizeof(uint64_t));
    Napi::BigInt64Array oeArray = Napi::BigInt64Array::New(env, count, oeBuf, 0);

    Napi::ArrayBuffer ceBuf = Napi::ArrayBuffer::New(env, (void *)underlying->copyEdgeIds, count * sizeof(uint64_t));
    Napi::BigInt64Array ceArray = Napi::BigInt64Array::New(env, count, ceBuf, 0);

    Napi::Object result = Napi::Object::New(env);
    result.Set(Napi::String::New(env, "originalFaceIds"), ofArray);
    result.Set(Napi::String::New(env, "copyFaceIds"), cfArray);
    result.Set(Napi::String::New(env, "originalEdgeIds"), oeArray);
    result.Set(Napi::String::New(env, "copyEdgeIds"), ceArray);

    return result;
}

Napi::Value _SolidDuplicate::GetBuffers_async(const Napi::CallbackInfo &info)
{
    return this->GetBuffers(info);
}