
#include "../include/ProgressIndicator.h"

ProgressIndicator::ProgressIndicator(const Napi::CallbackInfo &info) : Napi::ObjectWrap<ProgressIndicator>(info)
{
}

ProgressIndicator::~ProgressIndicator()
{
    onSuccess.Release();
    onCancel.Release();
    onProgress.Release();
}

Napi::Object ProgressIndicator::Init(const Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "ProgressIndicator", {
                                                                    //   InstanceAccessor<&ProgressIndicator::GetValue_success, &ProgressIndicator::SetValue_success>("success"),
                                                                    InstanceAccessor<&ProgressIndicator::GetValue_progress, &ProgressIndicator::SetValue_progress>("progress"),
                                                                    //   InstanceAccessor<&ProgressIndicator::GetValue_cancel, &ProgressIndicator::SetValue_cancel>("cancel"),
                                                                });
    Napi::FunctionReference *constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    exports.Set("ProgressIndicator", func);
    return exports;
}

bool ProgressIndicator::Initialize(size_t, size_t, IStrData &strData)
{
    cancel = false;
    return true;
}

bool ProgressIndicator::Progress(size_t n)
{
    size_t *value = new size_t(n);
    onProgress.BlockingCall(value);
    return !IsCancel();
}

void ProgressIndicator::Success()
{
}

void ProgressIndicator::Stop()
{
}

bool ProgressIndicator::IsCancel()
{
    return cancel;
}

void ProgressIndicator::SetCancel(bool c)
{
    cancel = c;
}

// Transform native data into JS data, passing it to the provided
// `callback` -- the TSFN's JavaScript function.
void CallJs1(Napi::Env env, Napi::Function callback, Context *context,
             size_t *data)
{
    // Is the JavaScript environment still available to call into, eg. the TSFN is
    // not aborted
    if (env != nullptr)
    {
        // On Node-API 5+, the `callback` parameter is optional; however, this example
        // does ensure a callback is provided.
        if (callback != nullptr)
        {
            callback.Call(context->Value(), {Napi::Number::New(env, *data)});
        }
    }
    if (data != nullptr)
    {
        // We're finished with the data.
        delete data;
    }
}

Napi::Value ProgressIndicator::GetValue_progress(const Napi::CallbackInfo &info)
{
    return info.Env().Undefined();
}

void ProgressIndicator::SetValue_progress(const Napi::CallbackInfo &info, const Napi::Value &value)
{
    Napi::Env env = info.Env();

    if (!info[0].IsFunction())
    {
        throw Napi::TypeError::New(env, "Expected first arg to be function");
    }

    Context *context = new Napi::Reference<Napi::Value>(Persistent(info.This()));

    onProgress = PROGRESS::New(env, info[0].As<Napi::Function>(), "Progress", 0, 1, context,
                               [](Napi::Env, void *,
                                  Context *ctx) { // Finalizer used to clean threads up
                                   delete ctx;
                               });
}

const TCHAR *ProgressIndicator::Msg(IStrData &strData) const
{
    return NULL;
}
