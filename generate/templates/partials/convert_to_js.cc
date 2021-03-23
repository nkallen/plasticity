{% if jsType == "Number" %}
    to = Napi::Number::New(env, {{ parsedName }});
{% elsif jsType == "Boolean" %}
    to = Napi::Boolean::New(env, {{ parsedName }});
{% elsif jsType == "Array" %}
    Napi::Array arr = Napi::Array::New(env);
    for (size_t i = 0; i < {{ parsedName }}->size(); i++) {
        arr[i] = {{ elementType }}::NewInstance(env, (*{{ parsedName }})[i]);
    }
    to = arr;
{% elsif isOnStack %}
    to = {{ cppType }}::NewInstance(env, new {{ rawType }}({{ parsedName }}));
{% else %}
    if ({{ parsedName }} != NULL) {
        to = {{ cppType }}::NewInstance(env, {% if constCast %}({{ rawType }}){% endif %}{{ parsedName }});
    } else {
        to = env.Null();
    }
{% endif %}