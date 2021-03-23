{%each args|argsInfo as arg%}
  {%if arg.isJsArg%}
    {%if not arg.isOptional%}
        {%if arg.isNumber |or arg.isEnum %}
            info[{{arg.jsArg}}].IsNumber()
        {%elsif arg.isCppString2CString %}
            info[{{arg.jsArg}}].IsString()
        {% elsif arg.jsType == "Array" %}
            info[{{arg.jsArg}}].IsArray()
        {%elsif arg.jsType == "Boolean" %}
            info[{{arg.jsArg}}].IsBoolean()
        {%else%}
            info[{{arg.jsArg}}].IsObject() &&
                info[{{arg.cArg }}].ToObject().InstanceOf({{ arg.cppType }}::GetConstructor(env))
        {%endif%}
        {% if not arg.lastJsArg %}&&{% endif %}
    {%endif%}
  {%endif%}
{%endeach%}

