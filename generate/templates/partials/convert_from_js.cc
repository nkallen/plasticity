<%_ if (arg.rawType == "double") { _%>
    <%- arg.const %> double <%- arg.name %> = info[<%- arg.jsIndex %>].ToNumber().DoubleValue();
<%_ } else if (arg.isSize) { _%>
    <%- arg.const %> size_t <%- arg.name %> = info[<%- arg.jsIndex %>].ToNumber().Int64Value();
<%_ } else if (arg.isNumber) { _%>
    <%- arg.const %> int <%- arg.name %> = info[<%- arg.jsIndex %>].ToNumber().Int64Value();
<%_ } else if (arg.isNumberPair) { _%>
    <%- arg.const %> int <%- arg.name %> = info[<%- arg.jsIndex %>].ToNumber().Int64Value();
<%_ } else if (arg.rawType == "bool") { _%>
    <%- arg.const %> bool <%- arg.name %> = info[<%- arg.jsIndex %>].ToBoolean();
<%_ } else if (arg.jsType == "Array") { _%>
    <%- include('convert_from_js_array.cc', { arg, _return }) %>
<%_ } else if (arg.isBuffer) { _%>
    const char * <%- arg.name %> = Napi::Buffer<const char>(env, info[<%- arg.jsIndex %>]).Data();
<%_ } else if (arg.isCppString2CString) { _%>
    const std::string <%- arg.name %> = info[<%- arg.jsIndex %>].ToString().Utf8Value();
<%_ } else if (arg.isC3dString) { _%>
    const c3d::string_t <%- arg.name %> = c3d::ToC3Dstring(info[<%- arg.jsIndex %>].ToString().Utf8Value());
<%_ } else if (arg.isBasicString) { _%>
    const std::string <%- arg.name %> = info[<%- arg.jsIndex %>].ToString();
<%_ } else if (arg.isPathString) { _%>
    const c3d::path_string <%- arg.name %> = c3d::StdToPathstring(info[<%- arg.jsIndex %>].ToString());
<%_ } else if (arg.isEnum) { _%>
    const <%- arg.rawType %> <%- arg.name %> = static_cast<<%- arg.rawType %>>(info[<%- arg.jsIndex %>].ToNumber().Uint32Value());
<%_ } else { _%>
    <%_ if (arg.isOptional || arg.isNullable) { _%>
        <%_ if (arg.isPointer) { _%>
            <%- arg.rawType %> <%- arg.ref %> <%- arg.name %> = NULL;
        <%_ } else { _%>
            <%- arg.rawType %> <%- arg.ref %> <%- arg.name %>;
        <%_ } _%>
        if (!(info[<%- arg.jsIndex %>].IsNull() || info[<%- arg.jsIndex %>].IsUndefined())) {
            <%- arg.cppType %> *<%- arg.name %>_ = <%- arg.cppType %>::Unwrap(info[<%- arg.jsIndex %>].ToObject());
                <%- arg.name %> = <% if (!arg.isPointer) { %>*<% } %>  <%- arg.name %>_ <%_ if (!arg.isRaw) { _%> ->_underlying <%_ }  _%>;
        }
    <%_ } else { _%>
        if (info[<%- arg.jsIndex %>].IsNull() || info[<%- arg.jsIndex %>].IsUndefined()) {
            <%_ if (_return == 'value') { _%>
                Napi::Error::New(env, "Passed null for non-optional parameter '<%- arg.name %>'").ThrowAsJavaScriptException();
                return env.Undefined();
            <%_ } else if (_return == 'promise') { _%>
                deferred.Reject(Napi::String::New(env, "Passed null for non-optional parameter '<%- arg.name %>'"));
                return deferred.Promise();
            <%_ } else { _%>
                Napi::Error::New(env, "Passed null for non-optional parameter '<%- arg.name %>'").ThrowAsJavaScriptException();
                return;
            <%_ } _%>
        }
        const class <%- arg.cppType %> *<%- arg.name %>_ = <%- arg.cppType %>::Unwrap(info[<%- arg.jsIndex %>].ToObject());
        
        <%- arg.const %> <%- arg.rawType %> <%- arg.ref %> <%- arg.name %> = <%_ if (!arg.isPointer && !arg.klass?.isPOD) { _%>*<%_ } _%><%- arg.name %>_->_underlying;
        
    <%_ } _%>
<%_ } _%>