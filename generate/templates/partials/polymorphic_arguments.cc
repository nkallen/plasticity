<%_ for (const arg of func.params) { _%>
    <%_ if (arg.isJsArg) { _%>
        ((
            <%_ if (arg.isNumber || arg.isEnum) { _%>
                info[<%-arg.jsIndex%>].IsNumber()
            <%_ } else if (arg.isCppString2CString) { _%>
                info[<%-arg.jsIndex%>].IsString()
            <%_ } else if (arg.isArray) { _%>
                info[<%-arg.jsIndex%>].IsArray()
            <%_ } else if (arg.isBoolean) { _%>
                info[<%-arg.jsIndex%>].IsBoolean()
            <%_ } else { _%>
                info[<%-arg.jsIndex%>].IsObject() &&
                    info[<%-arg.jsIndex %>].ToObject().InstanceOf(<%- arg.cppType %>::GetConstructor(env))
            <%_ } _%>
        )   
        <%_ if (arg.isOptional || arg.isNullable) { _%>
         || (info[<%- arg.jsIndex %>].IsNull() || info[<%- arg.jsIndex %>].IsUndefined())
        <%_ } _%>)
        <%_ if (arg.jsIndex < func.params.length - 1) { %> && <% } _%>
    <%_ } _%>
<%_ } _%>

