<%_ if (arg.rawType == "double") { _%>
    <%- arg.const %> double <%- arg.name %> = info[<%- arg.jsIndex %>].ToNumber().DoubleValue();
<%_ } else if (arg.isNumber) { _%>
    <%- arg.const %> int <%- arg.name %> = info[<%- arg.jsIndex %>].ToNumber().Int64Value();
<%_ } else if (arg.rawType == "bool") { _%>
    <%- arg.const %> bool <%- arg.name %> = info[<%- arg.jsIndex %>].ToBoolean();
<%_ } else if (arg.jsType == "Array") { _%>
    const Napi::Array <%- arg.name %>_ = Napi::Array(env, info[<%- arg.jsIndex %>]);
    <%_ if (arg.isIterator) { _%>
        <%_ if (_return == 'promise' || arg.ref == '*') { _%>
            List<<%- arg.elementType.rawType %>> *<%- arg.name %>_list = new List<<%- arg.elementType.rawType %>>(false);
        <%_ } else { _%>
            List<<%- arg.elementType.rawType %>> <%- arg.name %>_list (false);
        <%_ } _%>
    <%_ } else { _%>
        <%- arg.rawType %> <%- (_return == 'promise' || arg.ref == '*') ? '*' : '' %> <%- arg.name %> = <%- (_return == 'promise' || arg.ref == '*') ? 'new' : '' %> <%- arg.rawType %>(<%- arg.name %>_.Length(), 1);
    <%_ } _%>
    for (size_t i = 0; i < <%- arg.name %>_.Length(); i++) {
        if (<%- arg.name %>_[i].IsNull() || <%- arg.name %>_[i].IsUndefined()) {
            std::cerr << __FILE__ << ":" << __LINE__ << " warning: Passed an array with a null element at [" << i << "]. This is probably a mistake, so skipping\n";
            continue;
        }
        <%_ if (arg.elementType.rawType == "double") { _%>
            if (!<%- arg.name %>_[i].IsNumber()) {
                <%_ if (_return == 'value') { _%>
                    Napi::Error::New(env, "<%-arg.elementType.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
                    return env.Undefined();
                <%_ } else if (_return == 'promise') { _%>
                    deferred.Reject(Napi::String::New(env, "<%-arg.elementType.jsType%> <%-arg.name%> is required."));
                    return deferred.Promise();
                <%_ } else { _%>
                    Napi::Error::New(env, "<%-arg.elementType.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
                    return;
                <%_ } _%>
            } else {
                <%- arg.name %><%- (_return == 'promise' || arg.ref == '*') ? '->' : '.' %>Add(<%- arg.name %>_[i].ToNumber().DoubleValue());
            }
        <%_ } else { _%>
            if (!<%- arg.name %>_[i].IsObject() || !<%- arg.name %>_[i].ToObject().InstanceOf(<%- arg.elementType.cppType %>::GetConstructor(env))) {
                <%_ if (_return == 'value') { _%>
                    Napi::Error::New(env, "<%-arg.elementType.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
                    return env.Undefined();
                <%_ } else if (_return == 'promise') { _%>
                    deferred.Reject(Napi::String::New(env, "<%-arg.elementType.jsType%> <%-arg.name%> is required."));
                    return deferred.Promise();
                <%_ } else { _%>
                    Napi::Error::New(env, "<%-arg.elementType.jsType%> <%-arg.name%> is required.").ThrowAsJavaScriptException();
                    return;
                <%_ } _%>
            } else {
                <%- arg.name %><%- (arg.isIterator) ? '_list' : '' %><%- (_return == 'promise' || arg.ref == '*') ? '->' : '.' %>Add(<%_ if (!arg.elementType.isReference) { _%>*<%_ } _%><%- arg.elementType.cppType %>::Unwrap(<%- arg.name %>_[i].ToObject())->_underlying);
            }
        <%_ } _%>
    }
    <%_ if (arg.isIterator) { _%>
        <%_ if (_return == 'promise' || arg.ref == '*') { _%>
            LIterator<<%- arg.elementType.rawType %>> *<%- arg.name %> = new LIterator<<%- arg.elementType.rawType %>>(*<%- arg.name %>_list);
        <%_ } else { _%>
            LIterator<<%- arg.elementType.rawType %>> <%- arg.name %> = <%- arg.name %>_list;
        <%_ } _%>
    <%_ } _%>
<%_ } else if (arg.isCppString2CString) { _%>
    const std::string <%- arg.name %> = info[<%- arg.jsIndex %>].ToString().Utf8Value();
<%_ } else if (arg.isC3dString) { _%>
    const std::wstring <%- arg.name %> = c3d::StdToWString(info[<%- arg.jsIndex %>].ToString().Utf8Value());
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
            <%- arg.cppType %> *<%- arg.name %>_ = <%- arg.cppType %>::Unwrap(info[<%- arg.jsIndex %>].ToObject()); // 1
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
        
        <%- arg.rawType %> <%- arg.ref %> <%- arg.name %> = <%_ if (!arg.isPointer) { _%>*<%_ } _%><%- arg.name %>_->_underlying;
        
    <%_ } _%>
<%_ } _%>