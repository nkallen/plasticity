<%_ for (const arg of func.params) { _%>
    <%_ if (arg.isJsArg) { _%>
        <%_ if (!arg.isOptional) { _%>
            if ((info.Length() == <%- arg.jsIndex %>
            <%_ if (arg.isNumber || arg.isEnum) { _%>
                || !info[<%- arg.jsIndex %>].IsNumber())) {
            <%_ } else if (arg.isArrayBuffer) { _%>
                || !info[<%- arg.jsIndex %>].IsArrayBuffer())) {
            <%_ } else if (arg.isCppString2CString) { _%>
                || !info[<%- arg.jsIndex %>].IsString())) {
            <%_ } else if (arg.isC3dString) { _%>
                || !info[<%- arg.jsIndex %>].IsString())) {
            <%_ } else if (arg.isBoolean) { _%>
                || !info[<%- arg.jsIndex %>].IsBoolean())) {
            <%_ } else if (arg.isArray) { _%>
                || !info[<%- arg.jsIndex %>].IsArray())) {
            <%_ } else if (arg.isArray) { _%>
                || !(info[<%- arg.jsIndex %>].IsArray()) && Napi::Array(env, info[<%- arg.jsIndex %>]).Length() == 2) {
            <%_ } else { _%>
                || !(<% if (arg.isNullable) { %>info[<%- arg.jsIndex %>].IsNull() || <% } %>(info[<%- arg.jsIndex %>].IsObject() && info[<%-arg.jsIndex %>].ToObject().InstanceOf(<%- arg.cppType %>::GetConstructor(env)))))) {
            <%_ } _%>
                <%_ if (promise) { _%>
                    deferred.Reject(Napi::String::New(env, "<%-arg.jsType%> <%-arg.name%> is required."));
                    return deferred.Promise();
                <%_ } else { _%>
                    Napi::Error::New(env, "<%-arg.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
                    return env.Undefined();
                <%_ } _%>
            }
        <%_ } _%>
    <%_ } _%>
<%_ } _%>
