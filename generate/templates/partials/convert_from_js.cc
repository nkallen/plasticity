{% if rawType == "double" %}
    const double {{ name }} = info[{{ cArg }}].ToNumber().DoubleValue();
{% elsif rawType == "int" %}
    const int {{ name }} = info[{{ cArg }}].ToNumber().Int64Value();
{% elsif rawType == "bool" %}
    const bool {{ name }} = info[{{ cArg }}].ToBoolean();
{% elsif jsType == "Array" %}
    const Napi::Array {{ name }}_ = Napi::Array(env, info[{{ cArg }}]);
    {{= rawType =}} {{ name }} = {{= rawType =}}({{ name }}_.Length(), 1);
    for (size_t i = 0; i < {{ name }}_.Length(); i++) {
        if ({{ name }}_[i].IsNull() || {{ name }}_[i].IsUndefined()) {
            std::cerr << __FILE__ << ":" << __LINE__ << " warning: Passed an array with a null element at [" << i << "]. This is probably a mistake, so skipping\n";
        } else {
            {{ name }}.Add({% if not elementIsReference %}*{% endif %}{{ elementType }}::Unwrap({{ name }}_[i].ToObject())->_underlying);
        }
    }
{% elsif rawType == "const char *" %}
    const std::string {{ name }} = info[{{ cArg }}].ToString().Utf8Value();
{% elsif isEnum %}
    const {{ rawType }} {{ name }} = static_cast<{{ rawType }}>(info[{{ cArg }}].ToNumber().Uint32Value());
{% else %}
    {% if isOptional %}
        {{= rawType =}} {{ name }} = NULL;
        if (!(info[{{cArg }}].IsNull() || info[{{cArg }}].IsUndefined())) {
            const {{ cppType }} *{{ name }}_ = {{ cppType }}::Unwrap(info[{{cArg }}].ToObject());
            {{ name }} = {{ name }}_->_underlying;
        } else {
            {{ name }} = NULL;
        }
    {% else %}
        if (info[{{cArg }}].IsNull() || info[{{cArg }}].IsUndefined()) {
            Napi::Error::New(env, "Passed null for non-optional parameter '{{ name }}'").ThrowAsJavaScriptException();
            return;
        }
        const {{ cppType }} *{{ name }}_ = {{ cppType }}::Unwrap(info[{{cArg }}].ToObject());
        {% if rawType | isPointer %}
            {{= rawType =}} {{ name }} = {{ name }}_->_underlying;
        {% else %}
            {{= rawType =}} &{{ name }} = *{{ name }}_->_underlying;
        {% endif %}
    {% endif %}
{% endif %}