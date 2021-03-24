#include "../include/<%- klass.cppClassName %>.h"

Napi::Object <%- klass.cppClassName %>::Init(const Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "<%- klass.jsClassName %>", {
        <%_ for (const func of klass.functions) { _%>
            <%_ if (func.isStaticMethod) { _%>
        StaticMethod<&<%- klass.cppClassName %>::<%- func.name %>>("<%- func.name %>"),
            <%_ } else { _%>
        InstanceMethod<&<%- klass.cppClassName %>::<%- func.name %>>("<%- func.name %>"),
            <%_ } _%>
        <%_ } _%>
        <%_ for (const field of klass.fields) { _%>
        InstanceAccessor<&<%- klass.cppClassName %>::GetValue_<%- field.name %>, &<%- klass.cppClassName %>::SetValue_<%- field.name %>>("<%- field.name %>"),
        <%_ } _%>
    });
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    exports.Set("<%- klass.jsClassName %>", func);

    <%_ if (klass.extends.length > 0) { _%>
    Napi::Object global = env.Global();
    Napi::Object Object = global.Get("Object").ToObject();
    Napi::Function setPrototypeOf = Napi::Function(env, Object.Get("setPrototypeOf"));
    Napi::Value prototype = func.Get("prototype");

    Napi::Function superFunc = <%- klass.extends[0] %>::GetConstructor(env);
    Napi::FunctionReference* superConstructor = new Napi::FunctionReference();
    *superConstructor = Napi::Persistent(superFunc);

    Napi::Value superPrototype = superFunc.Get("prototype");
    setPrototypeOf.Call({prototype, superPrototype});
    setPrototypeOf.Call({func, superFunc});
    <%_ } _%>

    return exports;
}

<%- klass.cppClassName %>::<%- klass.cppClassName %>(const Napi::CallbackInfo& info) : Napi::ObjectWrap<<%- klass.cppClassName %>>(info) {
    Napi::Env env = info.Env();
    if (info.Length() == 1 && info[0].IsString() && info[0].ToString().Utf8Value() == "__skip_js_init__") return;
    <%_ if (klass.initializers.length > 0) { _%>
        <%_ for (const [i, initializer] of klass.initializers.entries()) { _%>
        <% if (i > 0) { %>} else <% } %>if (info.Length() == <%- initializer.params.length %> <%_ if (initializer.params.length != 0) { _%>&&<%_ } _%>
        <%- include('polymorphic_arguments.cc', { func: initializer }) %>
        ) {
            <%_ for (const arg of initializer.params) { _%>
            <%- include('convert_from_js.cc', { arg: arg }) %>
            <%_ } _%>

            <%- klass.rawClassName %> *underlying = new <%- klass.rawClassName %>(<%- initializer.params.map((arg) => arg.name).join(',') %>);
            if (underlying == NULL) {
                Napi::Error::New(env, "Invalid construction").ThrowAsJavaScriptException();
                return;
            }
            this->_underlying = underlying;
        <%_ } _%>
        } else {
            Napi::Error::New(env, "No matching constructor").ThrowAsJavaScriptException();
            return;
        }
    <%_ } else { _%>
        Napi::Error::New(env, "<%- klass.cppClassName %> cannot be instantiated directly").ThrowAsJavaScriptException();
    <%_ } _%>
}

Napi::Object <%- klass.cppClassName %>::NewInstance(Napi::Env env, <%- klass.rawClassName %> *underlying) {
    Napi::Object obj = env.GetInstanceData<Napi::ObjectReference>()->Value();
    Napi::Value value = obj.Get("<%- klass.cppClassName %>");
    Napi::Function f = value.As<Napi::Function>();
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Weak(f);
    Napi::Object inst = constructor->New({Napi::String::New(env, "__skip_js_init__")});
    <%- klass.cppClassName %> *unwrapped = <%- klass.cppClassName %>::Unwrap(inst);
    unwrapped->_underlying = underlying;

    return inst;
}

Napi::Function <%- klass.cppClassName %>::GetConstructor(Napi::Env env) {
    Napi::Object obj = env.GetInstanceData<Napi::ObjectReference>()->Value();
    Napi::Value value = obj.Get("<%- klass.jsClassName %>");
    Napi::Function f = value.As<Napi::Function>();
    return f;
}

<%- include('functions.cc', klass) %>

<%_ for (const field of klass.fields) { _%>
Napi::Value <%- klass.cppClassName %>::GetValue_<%- field.name %>(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::Value _to;
    <%- field.rawType %> <%- field.name %> = _underlying-><%- field.name %>;
    <%- include('convert_to_js.cc', { arg: field }) %>
}

void <%- klass.cppClassName %>::SetValue_<%- field.name %>(const Napi::CallbackInfo &info, const Napi::Value &value) {
    Napi::Env env = info.Env();
    <%- include('convert_from_js.cc', { arg: field }) %>
    _underlying-><%- field.name %> = <%- field.name %>;
}
<%_ } _%>

<%_ if (klass.freeFunctionName) { _%>
<%- klass.cppClassName %>::~<%- klass.cppClassName %>() {
    <%- klass.freeFunctionName %>(this->_underlying);
}
<%_ } _%>
