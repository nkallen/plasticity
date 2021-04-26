<%_ for (const func of klass.functions) { _%>
    <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker::<%- klass.cppClassName %>_<%- func.name %>_AsyncWorker(
        <%_ if (!func.isStatic) { _%><%- klass.rawClassName %> * underlying,<% } _%>
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
        : <%_ if (!func.isStatic) { _%>underlying(underlying),<% } _%>
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
        SetError ("Oops! Failed after 'working' 4 seconds.");
    }

    void <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker::OnOK() {
        Callback().Call({Env().Null(), Napi::String::New(Env(), "asf")});
    }
<%_ } _%>