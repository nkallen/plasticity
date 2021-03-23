#ifndef {{ cppClassName|upper }}_H
#define {{ cppClassName|upper }}_H

#include <napi.h>

{%each rawDependencies as dependency %}
#include <{{ dependency }}>
{%endeach%}

{%each dependencies as dependency%}
#include "{{ dependency }}"
{%endeach%}

class {{ cppClassName }} : public
  Napi::ObjectWrap<{{ cppClassName }}>
{
  public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

    {% each functions as function %}
        static Napi::Value {{ function.cppFunctionName }}(const Napi::CallbackInfo& info);
    {% endeach %}
};

#endif
