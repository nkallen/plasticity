#include "../include/<%- klass.cppClassName %>.h"

Napi::Object <%- klass.cppClassName %>::Init(const Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "<%- klass.jsClassName %>", {
        <%_ for (const func of klass.functions) { _%>
            {% if func.isStaticMethod %}
        StaticMethod<&<%- klass.cppClassName %>::<%- func.name %>>("<%- func.name %>"),
            {% else %}
        InstanceMethod<&<%- klass.cppClassName %>::<%- func.name %>>("<%- func.name %>"),
            {% endif %}
        <%_ } _%>
        <%_ for (const field of klass.fields) { _%>
        InstanceAccessor<&<%- klass.cppClassName %>::GetValue_<%- field.name %>, &<%- klass.cppClassName %>::SetValue_<%- field.name %>>("<%- field.name %>"),
        <%_ } _%>
    });
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    exports.Set("<%- klass.jsClassName %>", func);

    <%_ if (klass.extends) { _%>
    Napi::Object global = env.Global();
    Napi::Object Object = global.Get("Object").ToObject();
    Napi::Function setPrototypeOf = Napi::Function(env, Object.Get("setPrototypeOf"));
    Napi::Value prototype = func.Get("prototype");

    Napi::Function superFunc = <%- klass.extends %>::GetConstructor(env);
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
    {%if initializers %}
        {% if initializers.length > 0 %}
        {% each initializers as initializer i %}
        <%_ for (const initializer of klass.initializers) { _%>
        {% if i > 0%}} else {% endif %}if (info.Length() == {{ initializer.args.length }} {% if initializer.args.length != 0 %}&&{% endif %}
        {%partial polymorphicArguments initializer%}
        ) {
            {%each initializer.args | argsInfo as arg %}
            {%partial convertFromJS arg %}
            {%endeach%}

            <%- klass.rawClassName %> *underlying = new <%- klass.rawClassName %>(
                <%- initializer.args.map((arg) => arg.name).join(',') %>
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
        {% endif %}
    {% else %}
        Napi::Error::New(env, "<%- klass.cppClassName %> cannot be instantiated directly").ThrowAsJavaScriptException();
    {%endif%}
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

{% partial functions . %}

<%_ for (const field of klass.fields) { _%>
Napi::Value <%- klass.cppClassName %>::GetValue_<%- field.name %>(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::Value to;
    <%- field.rawType %> <%- field.name %> = _underlying-><%- field.name %>;
    {%partial convertToJS field|set "parsedName" field.name %}
}
void <%- klass.cppClassName %>::SetValue_<%- field.name %>(const Napi::CallbackInfo &info, const Napi::Value &value) {
    Napi::Env env = info.Env();
    {%partial convertFromJS field|set "cArg" 0 %}
    _underlying-><%- field.name %> = <%- field.name %>;
}
<%_ } _%>
