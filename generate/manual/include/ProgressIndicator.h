#ifndef PROGRESS_H
#define PROGRESS_H

#include <sstream>
#include <stdio.h>
#include <napi.h>
#include <alg_indicator.h>

using Context = Napi::Reference<Napi::Value>;

void CallJs1(Napi::Env env, Napi::Function callback, Context *context, size_t *data);
void CallJs2(Napi::Env env, Napi::Function callback, Context *context, void *data);



using SUCCESS = Napi::TypedThreadSafeFunction<Context, void, CallJs2>;
using PROGRESS = Napi::TypedThreadSafeFunction<Context, size_t, CallJs1>;
using CANCEL = Napi::TypedThreadSafeFunction<Context, void, CallJs2>;

class ProgressIndicator : public Napi::ObjectWrap<ProgressIndicator>, public IProgressIndicator
{

public:
    static Napi::Object Init(const Napi::Env env, Napi::Object exports);
    ProgressIndicator(const Napi::CallbackInfo &info);
    virtual ~ProgressIndicator();

public:
    virtual bool Initialize(size_t range, size_t delta, IStrData &msg); // Установка диапазона индикации, сброс состояния
    virtual bool Progress(size_t n);                                    // Обработать прогресс на n у.е. Вернет false - пора останавливаться
    virtual void Success();                                             // Ликвидация ошибок округления дорастим прогресс бар до 100%
    virtual bool IsCancel();                                            // Проверка не пора ли остановиться
    virtual void SetCancel(bool c);                                     // Скажем, что пора остановиться
    virtual void Stop();                                                // Команда пора остановиться
    virtual const TCHAR *Msg(IStrData &msg) const;                      // Получить строку

private:
    bool cancel;
    SUCCESS onSuccess;
    CANCEL onCancel;
    PROGRESS onProgress;

    Napi::Value GetValue_progress(const Napi::CallbackInfo &info);
    void SetValue_progress(const Napi::CallbackInfo &info, const Napi::Value &value);
};

#endif
