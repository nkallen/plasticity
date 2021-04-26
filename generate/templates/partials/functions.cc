<%_ for (const func of klass.functions) { _%>
    <%_ if (!func.isManual) { _%>
        Napi::Value <%- klass.cppClassName %>::<%- func.name %>(const Napi::CallbackInfo& info) {
            Napi::Env env = info.Env();
            <%_ if (func.overloads) { _%>
                <%_ for (const overload of func.overloads) { _%>
                    <%_ if (i > 0) { _%>} else <%_ } _%>if (info.Length() == <%- overload.args %> <%_ if (overload.args.length != 0) { _%>&&<%_ } _%>
                    <%- include('polymorphic_arguments.cc', overload) %>
                    ) {
                    <%- include('sync_function.cc', overload) %>
                <%_ } _%>
                } else {
                    Napi::Error::New(env, "No matching function").ThrowAsJavaScriptException();
                    return env.Undefined();
                }
            <%_ } else { _%>
                <%- include('guard_arguments.cc', { func: func, promise: false }) %>
                <%- include('sync_function.cc', { func: func}) %>
            <%_ } _%>
        }
    <%_ } _%>

    <%_ if (func.isManual) continue _%>
    Napi::Value <%- klass.cppClassName %>::<%- func.name %>_async(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
        <%- include('guard_arguments.cc', { func: func, promise: true }) %>

        <%_ for (const arg of func.params) { _%>
            <%_ if (!arg.isReturn) { _%>
                <%- include('convert_from_js.cc', { arg: arg, _return: 'promise' }) %>
            <%_ } _%>
        <%_ } _%>
        <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker* asyncWorker = new  <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker(
            <%_ if (!func.isStatic) { _%>_underlying,<% } _%>
            deferred
            <%_ for (const arg of func.params) { _%>
                <%_ if (arg.isReturn) continue; _%>,
                <% if (arg.isCppString2CString) { _%>
                <%- arg.name %>.c_str(), <%- arg.name %>.length()<%_ _%>
                <% } else { %>
                <%- arg.name _%>
                <%_ } _%>
            <%_ } _%>
        );
        asyncWorker->Queue();
        return deferred.Promise();
    }
<%_ } _%>
