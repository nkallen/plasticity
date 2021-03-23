#include "../../include/{{ cppClassName }}.h"

Napi::Object {{ cppClassName }}::Init(const Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "{{ jsClassName |or cppClassName }}", {
        {% each functions as function %}
            {% if function.isStaticMethod %}
        StaticMethod<&{{ cppClassName }}::{{ function.cppFunctionName }}>("{{ function.cppFunctionName }}"),
            {% else %}
        InstanceMethod<&{{ cppClassName }}::{{ function.cppFunctionName }}>("{{ function.cppFunctionName }}"),
            {% endif %}
        {% endeach %}
        {% each fields as field %}
        InstanceAccessor<&{{ cppClassName }}::GetValue_{{ field.name }}, &{{ cppClassName }}::SetValue_{{ field.name }}>("{{ field.name }}"),
        {% endeach %}
    });
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    exports.Set("{{ jsClassName |or cppClassName }}", func);

    {% if inheritsFrom %}
    Napi::Object global = env.Global();
    Napi::Object Object = global.Get("Object").ToObject();
    Napi::Function setPrototypeOf = Napi::Function(env, Object.Get("setPrototypeOf"));
    Napi::Value prototype = func.Get("prototype");

    Napi::Function superFunc = {{ inheritsFrom }}::GetConstructor(env);
    Napi::FunctionReference* superConstructor = new Napi::FunctionReference();
    *superConstructor = Napi::Persistent(superFunc);

    Napi::Value superPrototype = superFunc.Get("prototype");
    setPrototypeOf.Call({prototype, superPrototype});
    setPrototypeOf.Call({func, superFunc});
    {% endif %}

    return exports;
}

{{ cppClassName }}::{{ cppClassName }}(const Napi::CallbackInfo& info) : Napi::ObjectWrap<{{ cppClassName }}>(info) {
    Napi::Env env = info.Env();
    if (info.Length() == 1 && info[0].IsString() && info[0].ToString().Utf8Value() == "__skip_js_init__") return;
    {%if initializers %}
        {% if initializers.length > 0 %}
        {% each initializers as initializer i %}
        {% if i > 0%}} else {% endif %}if (info.Length() == {{ initializer.args.length }} {% if initializer.args.length != 0 %}&&{% endif %}
        {%partial polymorphicArguments initializer%}
        ) {
            {%each initializer.args | argsInfo as arg %}
            {%partial convertFromJS arg %}
            {%endeach%}

            {{ rawClassName }} *underlying = new {{ rawClassName }}(
            {%each initializer.args | argsInfo as arg %}
                {{ arg.name }}{%if not arg.lastArg %},{%endif%}
            {%endeach%});
            if (underlying == NULL) {
                Napi::Error::New(env, "Invalid construction").ThrowAsJavaScriptException();
                return;
            }
            this->_underlying = underlying;
        {% endeach %}
        } else {
            Napi::Error::New(env, "No matching constructor").ThrowAsJavaScriptException();
            return;
        }
        {% endif %}
    {% else %}
        Napi::Error::New(env, "{{ cppClassName }} cannot be instantiated directly").ThrowAsJavaScriptException();
    {%endif%}
}

Napi::Object {{ cppClassName }}::NewInstance(Napi::Env env, {{ rawClassName }} *underlying) {
    Napi::Object obj = env.GetInstanceData<Napi::ObjectReference>()->Value();
    Napi::Value value = obj.Get("{{ cppClassName }}");
    Napi::Function f = value.As<Napi::Function>();
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Weak(f);
    Napi::Object inst = constructor->New({Napi::String::New(env, "__skip_js_init__")});
    {{ cppClassName }} *unwrapped = {{ cppClassName }}::Unwrap(inst);
    unwrapped->_underlying = underlying;

    return inst;
}

Napi::Function {{ cppClassName }}::GetConstructor(Napi::Env env) {
    Napi::Object obj = env.GetInstanceData<Napi::ObjectReference>()->Value();
    Napi::Value value = obj.Get("{{ jsClassName |or cppClassName }}");
    Napi::Function f = value.As<Napi::Function>();
    return f;
}

{% partial functions . %}

{% each fields as field %}
Napi::Value {{ cppClassName }}::GetValue_{{ field.name }}(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::Value to;
    {{= field.rawType =}} {{ field.name }} = _underlying->{{ field.name }};
    {%partial convertToJS field|set "parsedName" field.name %}
}
void {{ cppClassName }}::SetValue_{{ field.name }}(const Napi::CallbackInfo &info, const Napi::Value &value) {
    Napi::Env env = info.Env();
    {%partial convertFromJS field|set "cArg" 0 %}
    _underlying->{{ field.name }} = {{ field.name }};
}
{% endeach %}
