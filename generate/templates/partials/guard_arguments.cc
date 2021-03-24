<%_ for (const arg of params) { _%>
    <%_ if (arg.isJsArg) { _%>
        if (info.Length() == <%-arg.jsArg%>
        <%_ if (arg.isNumber || arg.isEnum) { _%>
            || !info[<%-arg.jsArg%>].IsNumber()) {
        <%_ } else if (arg.isCppString2CString) { _%>
            || !info[<%-arg.jsArg%>].IsString()) {
        <%_ } else if (arg.isBoolean) { _%>
            || !info[<%-arg.jsArg%>].IsBoolean()) {
        <%_ } else if (arg.isArray) { _%>
            || !info[<%-arg.jsArg%>].IsArray()) {
        <%_ } else { _%>
            || !info[<%-arg.jsArg%>].IsObject()
            || !info[<%-arg.cppIndex %>].ToObject().InstanceOf(<%- arg.cppType %>::GetConstructor(env))) {
        <%_ } _%>
            Napi::Error::New(env, "<%-arg.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
            return env.Undefined();
        }
    <%_ } _%>
<%_ } _%>
