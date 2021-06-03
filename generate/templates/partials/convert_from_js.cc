<%_ if (arg.rawType == "double") { _%>
    <%- arg.const %> double <%- arg.name %> = info[<%- arg.cppIndex %>].ToNumber().DoubleValue();
<%_ } else if (arg.isNumber) { _%>
    <%- arg.const %> int <%- arg.name %> = info[<%- arg.cppIndex %>].ToNumber().Int64Value();
<%_ } else if (arg.rawType == "bool") { _%>
    <%- arg.const %> bool <%- arg.name %> = info[<%- arg.cppIndex %>].ToBoolean();
<%_ } else if (arg.jsType == "Array") { _%>
    const Napi::Array <%- arg.name %>_ = Napi::Array(env, info[<%- arg.cppIndex %>]);
    <%- arg.rawType %> <%- (_return == 'promise' || arg.ref == '*') ? '*' : '' %> <%- arg.name %> = <%- (_return == 'promise' || arg.ref == '*') ? 'new' : '' %> <%- arg.rawType %>(<%- arg.name %>_.Length(), 1);
    for (size_t i = 0; i < <%- arg.name %>_.Length(); i++) {
        if (<%- arg.name %>_[i].IsNull() || <%- arg.name %>_[i].IsUndefined()) {
            std::cerr << __FILE__ << ":" << __LINE__ << " warning: Passed an array with a null element at [" << i << "]. This is probably a mistake, so skipping\n";
        } else if (!<%- arg.name %>_[i].IsObject() || !<%- arg.name %>_[i].ToObject().InstanceOf(<%- arg.elementType.cppType %>::GetConstructor(env))) {
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
            <%- arg.name %><%- (_return == 'promise' || arg.ref == '*') ? '->' : '.' %>Add(<%_ if (!arg.elementType.isReference) { _%>*<%_ } _%><%- arg.elementType.cppType %>::Unwrap(<%- arg.name %>_[i].ToObject())->_underlying);
        }
    }
<%_ } else if (arg.isCppString2CString) { _%>
    const std::string <%- arg.name %> = info[<%- arg.cppIndex %>].ToString().Utf8Value();
<%_ } else if (arg.isEnum) { _%>
    const <%- arg.rawType %> <%- arg.name %> = static_cast<<%- arg.rawType %>>(info[<%- arg.cppIndex %>].ToNumber().Uint32Value());
<%_ } else { _%>
    <%_ if (arg.isOptional || arg.isNullable) { _%>
        <%- arg.rawType %> <%- arg.ref %> <%- arg.name %> = NULL;
        if (!(info[<%- arg.cppIndex %>].IsNull() || info[<%- arg.cppIndex %>].IsUndefined())) {
            const <%- arg.cppType %> *<%- arg.name %>_ = <%- arg.cppType %>::Unwrap(info[<%- arg.cppIndex %>].ToObject());
            <%- arg.name %> = <%- arg.name %>_->_underlying;
        } else {
            <%- arg.name %> = NULL;
        }
    <%_ } else { _%>
        if (info[<%- arg.cppIndex %>].IsNull() || info[<%- arg.cppIndex %>].IsUndefined()) {
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
        const <%- arg.cppType %> *<%- arg.name %>_ = <%- arg.cppType %>::Unwrap(info[<%- arg.cppIndex %>].ToObject());
        <%_ if (arg.isPointer) { _%>
            <%- arg.rawType %> <%- arg.ref %> <%- arg.name %> = <%- arg.name %>_->_underlying;
        <%_ } else { _%>
            <%- arg.rawType %> <%- arg.ref %> <%- arg.name %> = *<%- arg.name %>_->_underlying;
        <%_ } _%>
    <%_ } _%>
<%_ } _%>