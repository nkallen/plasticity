#ifndef <%- klass.cppClassName.toUpperCase() %>_H
#define <%- klass.cppClassName.toUpperCase() %>_H

#include <napi.h>
#include <tuple>

#include <<%- klass.rawHeader %>>

<%_ for (const dependency of klass.dependencies) { _%>
#include "<%- dependency %>"
<%_ } _%>


class <%- klass.cppClassName %> : public
  Napi::ObjectWrap<<%- klass.cppClassName %>>
{
  public:
        static Napi::Object Init(Napi::Env env, Napi::Object exports);

    <%_ for (const func of klass.functions) { _%>
        static Napi::Value <%- func.name %>(const Napi::CallbackInfo& info);
        static Napi::Value <%- func.name %>_async(const Napi::CallbackInfo& info);
    <%_ } _%>
};

<%- include('async_worker.h') %>

#endif
