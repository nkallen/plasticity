<%_ for (const func of klass.functions) { _%>
    <%_ if (!func.isManual) { _%>
        Napi::Value <%- klass.cppClassName %>::<%- func.name %>(const Napi::CallbackInfo& info) {
            Napi::Env env = info.Env();
            <%_ if (func.overloads) { _%>
                <%_ for (const overload of func.overloads) { _%>
                    <%_ if (i > 0) { _%>} else <%_ } _%>if (info.Length() == <%- overload.args %> <%_ if (overload.args.length != 0) { _%>&&<%_ } _%>
                    <%- include('polymorphic_arguments.cc', overload) %>
                    ) {
                    {%_ partial syncFunction overload _%}
                <%_ } _%>
                } else {
                    Napi::Error::New(env, "No matching function").ThrowAsJavaScriptException();
                    return env.Undefined();
                }
            <%_ } else { _%>
                <%- include('guard_arguments.cc', func) %>
                {%_ partial syncFunction function _%}
            <%_ } _%>
        }
    <%_ } _%>
<%_ } _%>
