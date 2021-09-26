<%_ for (const func of klass.functions) { _%>
    <%_ if (!func.isManual) { _%>
        Napi::Value <%- klass.cppClassName %>::<%- func.jsName %>(const Napi::CallbackInfo& info) {
            Napi::Env env = info.Env();
            <%- include('guard_arguments.cc', { func: func, promise: false }) %>
            <%- include('sync_function.cc', { func: func}) %>
        }
    <%_ } _%>

    <%_ if (func.isManual) continue _%>
    Napi::Value <%- klass.cppClassName %>::<%- func.jsName %>_async(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
        <%- include('guard_arguments.cc', { func: func, promise: true }) %>

        <%_ for (const arg of func.params) { _%>
            <%_ if (!arg.isReturn) { _%>
                <%- include('convert_from_js.cc', { arg: arg, _return: 'promise' }) %>
            <%_ } _%>
        <%_ } _%>
        <%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker* asyncWorker = new <%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker(
            <%_ if (!func.isStatic) { _%>_underlying,<% } _%>
            deferred
            <%_ for (const arg of func.params) { _%>
                <%_ if (arg.isReturn) continue; _%>,
                <% if (arg.isCppString2CString) { _%>
                <%- arg.name %>.c_str(), <%- arg.name %>.length()<%_ _%>
                <%_ } else if (arg.jsType == "Array" && arg.ref != '*') { _%>
                *<%- arg.name _%>
                <% } else { %>
                <%- arg.name _%>
                <%_ } _%>
            <%_ } _%>
        );
        asyncWorker->Queue();
        return deferred.Promise();
    }
<%_ } _%>
