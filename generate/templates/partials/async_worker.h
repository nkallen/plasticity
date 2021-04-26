<%_ for (const func of klass.functions) { _%>
  class <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker : public Napi::AsyncWorker {
      
      public:
          <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker(Napi::Function& callback<%_ _%>
            <%_ for (const arg of func.params) { _%>
                <%_ if (arg.isReturn) continue; _%>,
                <% if (arg.isCppString2CString) { _%>
                const char * <%- arg.name %>, size_t <%- arg.name %>_length
                <%_ } else { _%>
                <%- arg.rawType %> <%- arg.ref %> <%- arg.name _%><%_ if (arg.isOptional) { %> = <%- arg.default _%><%_ } _%>
                <%_ } _%>
            <%_ } _%>
          <%_ %>);
          virtual ~<%- klass.cppClassName %>_<%- func.name %>_AsyncWorker() {};

          void Execute();
          void OnOK();

      private:
        <%_ for (const arg of func.params) { _%>
            <%_ if (arg.isReturn) continue; _%>
            <% if (arg.isCppString2CString) { _%>
            const char * <%- arg.name %>; size_t <%- arg.name %>_length;
            <%_ } else { _%>
            <%- arg.const %> <%- arg.rawType %> <%- arg.ref %> <%- arg.name _%><%_ if (arg.isOptional) { _%> = <%- arg.default _%><%_ } _%>;
            <%_ } _%>
        <%_ } _%>
  };

<%_ } _%>