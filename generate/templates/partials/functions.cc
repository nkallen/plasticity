{% each functions as function %}
  {% if not function.ignore %}
    {% if function.isManual %}
    {% else %}
Napi::Value {{ cppClassName }}::{{ function.cppFunctionName }}(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  {% if function.overloads %}
    {% each function.overloads as overload %}
        {% if i > 0%}} else {% endif %}if (info.Length() == {{ overload.args|jsArgsCount }} {% if overload.args.length != 0 %}&&{% endif %}
        {%partial polymorphicArguments overload%}
        ) {
        {% partial syncFunction overload %}
    {% endeach %}
        } else {
            Napi::Error::New(env, "No matching function").ThrowAsJavaScriptException();
            return env.Undefined();
        }
  {% else %}
    {%partial guardArguments function%}
    {% partial syncFunction function %}
  {% endif %}
}
    {% endif %}
  {% endif %}
{% endeach %}