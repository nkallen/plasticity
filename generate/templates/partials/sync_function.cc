<%- include('declare_out_params.cc', { func }) %>

<%_ for (const arg of func.params) { _%>
    <%_ if (!arg.isReturn) { _%>
        <%- include('convert_from_js.cc', { arg: arg, _return: 'value' }) %>
    <%_ } _%>
<%_ } _%>

<%- func.before %>
<% if (func.returnType.isReturn || func.returnType.isErrorCode || func.returnType.isErrorBool) { _%> <%- func.returnType.const %> <%- func.returnType.rawType %> <%- func.returnType.ref %> <%- func.returnType.name %> = <% } _%>
<%_ if (func.isStatic) { _%>
<%- /::/.test(func.rawName) ? func.rawName : '::' + func.cppName %>
<%_ } else { _%>
_underlying<%- klass.isPOD ? '.' : '->' %><%- func.cppName %>
<%_ } _%>(
<%_ for (const arg of func.params) { _%>
    <% if (arg.isCppString2CString) { _%>
    <%- arg.name %>.c_str(), <%- arg.name %>.length()
    <%_ } else if (arg.shouldAlloc) { _%>
    <%- arg.isPointer ? '' : '*' %><%- arg.name %>
    <%_ } else if (arg.isOptional) { _%>
    info.Length() == <%- arg.jsIndex %> || info[<%- arg.jsIndex %>].IsNull() ? <%- arg.default %> : <%- arg.name %>
    <%_ } else { _%>
    <%- arg.name %>
    <%_ } _%>
    <%_ if (arg.cppIndex < func.params.length - 1) { _%>,<%_ } _%>
<%_ } _%>
<%- func.after %>
);


<%_ if (func.returnType.isErrorCode) { _%>
if (_result == rt_Success) {
<%_ } else if (func.returnType.isErrorBool) { _%>
if (_result) {
<%_ } _%>

<%_ if (func.returnsCount == 0) { _%>
    return env.Undefined();
<%_ } else { _%>
    <%_ if (func.returnsCount > 1) { _%>
        Napi::Object _toReturn = Napi::Object::New(env);
    <%_ } _%>
    Napi::Value _to;

    <%_ for (const _return of func.returns) { _%>
        <%- include('convert_to_js.cc', { arg: _return, skipCopy: false }) %>
        <%_ if (func.returnsCount > 1) { _%>
        _toReturn.Set(Napi::String::New(env, "<%- _return.name %>"), _to);
        <%_ } _%>
    <%_ } _%>
    <% if (func.returnsCount == 1) { _%>
        return _to;
    <%_ } else { _%>
        return _toReturn;
    <%_ } _%>
<%_ } _%>

<% if (func.returnType.isErrorCode) { _%>
} else {
    std::ostringstream msg;
    msg << "Operation <%- func.name %> failed with error: " << Error::GetSolidErrorResId(_result);
    Napi::Error error = Napi::Error::New(env, msg.str());
    error.Set("code", Napi::Number::New(env, _result));
    error.Set("isC3dError", true);
    error.ThrowAsJavaScriptException();
    return env.Undefined();
}
<%_ } else if (func.returnType.isErrorBool) { _%>
} else {
    std::ostringstream msg;
    msg << "Operation <%- func.name %> failed";
    Napi::Error error = Napi::Error::New(env, msg.str());
    error.Set("isC3dError", true);
    error.ThrowAsJavaScriptException();
    return env.Undefined();
}
<%_ } _%>