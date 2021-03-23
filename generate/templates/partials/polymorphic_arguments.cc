<%_ for (const arg of args) { %_>
    <%_ if (arg.isJsArg) { _%>
        <%_ if (arg.isNumber || arg.isEnum) { _%>
            info[<%-arg.jsArg%>].IsNumber()
        <%_ } else if (arg.isCppString2CString) { _%>
            info[<%-arg.jsArg%>].IsString()
        <%_ } else if (arg.isArray) { _%>
            info[<%-arg.jsArg%>].IsArray()
        <%_ } else if (arg.isBoolean) { _%>
            info[<%-arg.jsArg%>].IsBoolean()
        <%_ } else { _%>
            info[<%-arg.jsArg%>].IsObject() &&
                info[<%-arg.cArg %>].ToObject().InstanceOf(<%- arg.cppType %>::GetConstructor(env))
        <%_ } _%>
        {% if (!arg.lastJsArg) { %}&&{% } %}
    <%_ } _%>
<%_ } _%>

