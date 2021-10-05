<%_ for (const func of klass.functions) { _%>
    <%_ if (func.isManual) continue _%>
    <%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker::<%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker(
        <%_ if (!func.isStatic) { _%><%- klass.rawClassName %> * _underlying,<% } _%>
        Napi::Promise::Deferred const &d
        <%_ for (const arg of func.params) { _%>
            <%_ if (arg.isReturn) continue; _%>,
            <% if (arg.isCppString2CString) { _%>
            const char * <%- arg.name %>, size_t <%- arg.name %>_length
            <%_ } else if (arg.isC3dString) { _%>
            const c3d::string_t <%- arg.name %>
            <%_ } else { _%>
            <%- arg.const %> <%- arg.rawType %> <%- arg.ref %> <%- arg.name _%>
            <%_ } _%>
        <%_ } _%>
    )
        : <%_ if (!func.isStatic) { _%>_underlying(_underlying),<% } _%>
        <%_ _%>PromiseWorker(d)<%_ _%>
        <%_ for (const arg of func.params) { _%>
            <%_ if (arg.isReturn) continue; _%>,
            <% if (arg.isCppString2CString) { _%>
            <%- arg.name %>(<%- arg.name %>), <%- arg.name %>_length(<%- arg.name %>_length)
            <%_ } else { _%>
            <%- arg.name _%>(<%- arg.name %>)
            <%_ } _%>
        <%_ } _%> {};

    void <%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker::Execute() {
        EnterParallelRegion();

        <%- include('declare_out_params.cc', { func }) %>

        <%- func.before %>
        <% if (func.returnType.isReturn || func.returnType.isErrorCode || func.returnType.isErrorBool) { _%> <%- func.returnType.const %> <%- func.returnType.rawType %> <%- func.returnType.ref %> <%- func.returnType.name %> = <% } _%>
        <%_ if (!func.isStatic) { _%>_underlying-><% } else { _%>::<%_ } _%><%- func.rawName %>(
        <%_ for (const arg of func.params) { _%>
            <% if (arg.isCppString2CString) { _%>
            <%- arg.name %>, <%- arg.name %>_length
            <%_ } else if (arg.shouldAlloc) { _%>
            <%- arg.isPointer ? '' : '*' %><%- arg.name %>
            <%_ } else { _%>
            <%- arg.name %>
            <%_ } _%>
            <%_ if (arg.cppIndex < func.params.length - 1) { _%>,<%_ } _%>
        <%_ } _%>
        );

        <%_ if (func.returnType.isErrorCode) { _%>
        if (_result == rt_Success) {
        <%_ } else if (func.returnType.isErrorBool) { _%>
        if (_result) {
        <%_ } _%>

        <%_ if (func.returnsCount == 0) { _%>
        <%_ } else { _%>
            <%_ for (const arg of func.returns) { _%>
                <%_ if (arg.isPrimitive) { _%>
                this-><%- arg.name %> = <%- arg.name %>;
                <%_ } else if (arg.isOnStack) { _%>
                this-><%- arg.name %> = new (<%- arg.rawType %>)(<%- arg.name %>);
                <%_ } else if (arg.isSPtr) { _%>
                this-><%- arg.name %> = <%- arg.name %>;
                <%_ } else if (!arg.isPointer && !arg.shouldAlloc) { _%>
                this-><%- arg.name %> = (<%- arg.rawType %> *)&(<%- arg.name %>);
                <%_ } else { _%>
                this-><%- arg.name %> = <%- arg.name %>;
                <%_ } _%>
            <%_ } _%>
        <%_ } _%>

        <% if (func.returnType.isErrorCode) { _%>
        } else {
            std::ostringstream msg;
            msg << "Operation <%- func.jsName %> failed with error: " << Error::GetSolidErrorResId(_result);
            SetError(msg.str());
        }
        <%_ } else if (func.returnType.isErrorBool) { _%>
        } else {
            std::ostringstream msg;
            msg << "Operation <%- func.jsName %> failed";
            SetError(msg.str());
        }
        <%_ } _%>

        ExitParallelRegion();
    }

    void <%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker::Resolve(Napi::Promise::Deferred const &deferred) {
        Napi::Env env = deferred.Env();
        <%_ if (func.returnsCount == 0) { _%>
            deferred.Resolve(env.Undefined());
        <%_ } else if (func.returnsCount == 1) { _%>
            Napi::Value _to;
            <%_ const arg = func.returns[0] _%>
            <%_ if (arg.isSPtr) { _%>
            <%- arg.rawType %> <%- arg.name %> = this-><%- arg.name %>;
            <%- arg.name %>->AddRef();
            <%_ } else { _%>
            <%- arg.const %> <%- arg.rawType %> <%- arg.isPrimitive ? '' : '*' %> <%- arg.name %> = this-><%- arg.name %>;
            <%_ } _%>
            <%- include('convert_to_js.cc', { arg: arg, skipCopy: true }) %>
            deferred.Resolve(_to);
        <%_ } else { _%>
            Napi::Value _to;
            Napi::Object _toReturn = Napi::Object::New(env);

            <%_ for (const arg of func.returns) { _%>
                <%- arg.const %> <%- arg.rawType %> <%- arg.isPrimitive ? '' : '*' %> <%- arg.name %> = this-><%- arg.name %>;
                <%- include('convert_to_js.cc', { arg: arg, skipCopy: true }) %>
                _toReturn.Set(Napi::String::New(env, "<%- arg.name %>"), _to);
            <%_ } _%>

            deferred.Resolve(_toReturn);
        <%_ } _%>
    }

    void <%- klass.cppClassName %>_<%- func.jsName %>_AsyncWorker::Reject(Napi::Promise::Deferred const &deferred, Napi::Error const & error) {
        error.Value()["isC3dError"] = true;
        deferred.Reject(error.Value());
    }
<%_ } _%>