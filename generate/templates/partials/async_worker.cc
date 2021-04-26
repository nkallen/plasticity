<%_ for (const func of klass.functions) { _%>
    <%_ if (func.isManual) continue _%>
    <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker::<%- klass.cppClassName %>_<%- func.name %>_AsyncWorker(
        <%_ if (!func.isStatic) { _%><%- klass.rawClassName %> * _underlying,<% } _%>
        Napi::Function& callback
        <%_ for (const arg of func.params) { _%>
            <%_ if (arg.isReturn) continue; _%>,
            <% if (arg.isCppString2CString) { _%>
            const char * <%- arg.name %>, size_t <%- arg.name %>_length
            <%_ } else { _%>
            <%- arg.rawType %> <%- arg.ref %> <%- arg.name _%>
            <%_ } _%>
        <%_ } _%>
    )
        : <%_ if (!func.isStatic) { _%>_underlying(_underlying),<% } _%>
        <%_ _%>Napi::AsyncWorker(callback)<%_ _%>
        <%_ for (const arg of func.params) { _%>
            <%_ if (arg.isReturn) continue; _%>,
            <% if (arg.isCppString2CString) { _%>
            <%- arg.name %>(<%- arg.name %>), <%- arg.name %>_length(<%- arg.name %>_length)
            <%_ } else { _%>
            <%- arg.name _%>(<%- arg.name %>)
            <%_ } _%>
        <%_ } _%> {};

    void <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker::Execute() {
        <%_ for (const _return of func.outParams) { _%>
            <% if (_return.shouldAlloc) { _%>
            <%- _return.rawType %> *<%- _return.name %> = new <%- _return.rawType %>;
            <% } else { _%>
            <%- _return.rawType %> <%- _return.isPointer ? '*' : '' %> <%- _return.name %> = NULL;
            <%_ } _%>
        <%_ } _%>

        <%- func.before %>
        <% if (func.returnType.isReturn || func.returnType.isErrorCode || func.returnType.isErrorBool) { _%> <%- func.returnType.const %> <%- func.returnType.rawType %> <%- func.returnType.ref %> <%- func.returnType.name %> = <% } _%>
        <%_ if (!func.isStatic) { _%>_underlying-><% } else { _%>::<%_ } _%><%- func.name %>(
        <%_ for (const arg of func.params) { _%>
            <% if (arg.isCppString2CString) { _%>
            <%- arg.name %>, <%- arg.name %>_length
            <%_ } else if (arg.shouldAlloc) { _%>
            *<%- arg.name %>
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
        <%_ } else if (func.returnsCount == 1) { _%>
            SetOK(<%- func.returns[0].name %>);
        <%_ } else { _%>
            __ok = new std::tuple<
                <%_ for (const [i, arg] of func.returns.entries()) { _%>
                    <%- arg.const %> <%- arg.rawType %> <%- arg.shouldAlloc || arg.isPointer ? '*' : '' %> <% if (i < func.returns.length - 1) { %>,<% } %>
                <%_ } _%>
            >(
                <%_ for (const [i, _return] of func.returns.entries()) { _%>
                    <%- _return.name %><% if (i < func.returns.length - 1) { %>,<% } %>
                <%_ } _%>
            );
        <%_ } _%>

        <% if (func.returnType.isErrorCode) { _%>
        } else {
            std::ostringstream msg;
            msg << "Operation <%- func.name %> failed with error: " << Error::GetSolidErrorResId(_result);
            SetError(msg.str());
        }
        <%_ } else if (func.returnType.isErrorBool) { _%>
        } else {
            std::ostringstream msg;
            msg << "Operation <%- func.name %> failed";
            SetError(msg.str());
        }
        <%_ } _%>
    }

    <%_ if (func.returnsCount == 1) { _%>
    <%_ const arg = func.returns[0] _%>
    void <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker::SetOK(<%- arg.const %> <%- arg.rawType %> <%- arg.shouldAlloc || arg.isPointer ? '*' : '' %> <%- arg.name %>) {

    }
    <%_ } else if (func.returnsCount > 1) { _%>
    void <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker::SetOK(
        <%_ for (const [i, arg] of func.returns.entries()) { _%>
            <%- arg.const %> <%- arg.rawType %> <%- arg.shouldAlloc || arg.isPointer ? '*' : '' %> <%- arg.name %><% if (i < func.returns.length - 1) { %>,<% } %>
        <%_ } _%>
    ) {
        
    }
    <%_ } _%>


<%_ } _%>