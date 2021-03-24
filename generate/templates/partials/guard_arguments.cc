<%_ for (const arg of params) { _%>
    <%_ if (arg.isJsArg) { _%>
        if (info.Length() == <%- arg.jsIndex %>
        <%_ if (arg.isNumber || arg.isEnum) { _%>
            || !info[<%- arg.jsIndex %>].IsNumber()) {
        <%_ } else if (arg.isCppString2CString) { _%>
            || !info[<%- arg.jsIndex %>].IsString()) {
        <%_ } else if (arg.isBoolean) { _%>
            || !info[<%- arg.jsIndex %>].IsBoolean()) {
        <%_ } else if (arg.isArray) { _%>
            || !info[<%- arg.jsIndex %>].IsArray()) {
        <%_ } else { _%>
            || !info[<%- arg.jsIndex %>].IsObject()
            || !info[<%-arg.cppIndex %>].ToObject().InstanceOf(<%- arg.cppType %>::GetConstructor(env))) {
        <%_ } _%>
            Napi::Error::New(env, "<%-arg.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
            return env.Undefined();
        }
    <%_ } _%>
<%_ } _%>
