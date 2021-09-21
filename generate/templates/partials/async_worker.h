<%_ for (const func of klass.functions) { _%>
<%_ if (func.isManual) continue _%>

  class <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker : public PromiseWorker {
      public:
          <%- klass.cppClassName %>_<%- func.name %>_AsyncWorker(
            <%_ if (!func.isStatic) { _%><%- klass.rawClassName %> * _underlying,<% } _%>
            Napi::Promise::Deferred const &d<%_ _%>
            <%_ for (const arg of func.params) { _%>
                <%_ if (arg.isReturn) continue; _%>,
                <% if (arg.isCppString2CString) { _%>
                const char * <%- arg.name %>, size_t <%- arg.name %>_length
                <%_ } else if (arg.isC3dString) { _%>
                const std::string <%- arg.name %>
                <%_ } else { _%>
                <%- arg.const %> <%- arg.rawType %> <%- arg.ref %> <%- arg.name _%><%_ if (arg.isOptional) { %> = <%- arg.default _%><%_ } _%>
                <%_ } _%>
            <%_ } _%>
          <%_ %>);
          virtual ~<%- klass.cppClassName %>_<%- func.name %>_AsyncWorker() {};

          void Execute() override;
          void Resolve(Napi::Promise::Deferred const &deferred) override;
          void Reject(Napi::Promise::Deferred const &deferred, Napi::Error const &error) override;

      private:
        <%_ if (!func.isStatic) { _%><%- klass.rawClassName %> * _underlying;<% } _%>
        <%_ for (const arg of func.params) { _%>
            <%_ if (arg.isReturn) continue; _%>
            <% if (arg.isCppString2CString) { _%>
            const char * <%- arg.name %>; size_t <%- arg.name %>_length;
            <%_ } else if (arg.isC3dString) { _%>
            const std::string <%- arg.name %>;
            <%_ } else if (arg.isBasicString) { _%>
            const std::string <%- arg.name %>;
            <%_ } else { _%>
            <%- arg.const %> <%- arg.rawType %> <%- arg.ref %> <%- arg.name _%><%_ if (arg.isOptional) { _%> = <%- arg.default _%><%_ } _%>;
            <%_ } _%>
        <%_ } _%>

        <%_ if (func.returnsCount == 0) { _%>
        <%_ } else if (func.returnsCount > 0) { _%>
            <%_ for (const arg of func.returns) { _%>
                <%- arg.const %> <%- arg.rawType %> <%- arg.isPrimitive ? '' : '*' %> <%- arg.name %>;
            <%_ } _%>
        <%_ } _%>
  };

<%_ } _%>