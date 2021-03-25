#ifndef <%- klass.cppClassName.toUpperCase() %>_H
#define <%- klass.cppClassName.toUpperCase() %>_H

#include <napi.h>

#include <<%- klass.rawHeader %>>

<%_ for (const dependency of klass.dependencies) { _%>
#include "<%- dependency %>"
<%_ } _%>

class <%- klass.cppClassName -%> : public
  Napi::ObjectWrap<<%- klass.cppClassName -%>>
{
  public:
        static Napi::Object Init(const Napi::Env env, Napi::Object exports);
        static Napi::Object NewInstance(const Napi::Env env, <%- klass.rawClassName %> *raw);
        static Napi::Function GetConstructor(Napi::Env env);
        <%- klass.cppClassName -%>(const Napi::CallbackInfo& info);

    <%_ for (const func of klass.functions) { _%>
        Napi::Value <%- func.name %>(const Napi::CallbackInfo& info);
    <%_ } _%>

    <%- klass.rawClassName %> * _underlying;

    <%_ if (klass.freeFunctionName && !klass.protectedDestructor) { _%>
    ~<%- klass.cppClassName -%>();
    <%_ } _%>


  private:
    <%_ for (const field of klass.fields) { _%>
        Napi::Value GetValue_<%- field.name %>(const Napi::CallbackInfo &info);
        void SetValue_<%- field.name %>(const Napi::CallbackInfo &info, const Napi::Value &value);
    <%_ } _%>

};

#endif
