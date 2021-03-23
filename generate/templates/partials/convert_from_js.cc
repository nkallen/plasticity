<%_ if (arg.rawType == "double") { _%>
    const double <%- arg.name %> = info[<%- arg.cArg %>].ToNumber().DoubleValue();
<%_ } else if (arg.rawType == "int") { _%>
    const int <%- arg.name %> = info[<%- arg.cArg %>].ToNumber().Int64Value();
<%_ } else if (arg.rawType == "bool") { _%>
    const bool <%- arg.name %> = info[<%- arg.cArg %>].ToBoolean();
<%_ } else if (arg.jsType == "Array") { _%>
    const Napi::Array <%- arg.name %>_ = Napi::Array(env, info[<%- arg.cArg %>]);
    <%- arg.rawType %> <%- arg.name %> = <%- arg.rawType %>(<%- arg.name %>_.Length(), 1);
    for (size_t i = 0; i < <%- arg.name %>_.Length(); i++) {
        if (<%- arg.name %>_[i].IsNull() || <%- arg.name %>_[i].IsUndefined()) {
            std::cerr << __FILE__ << ":" << __LINE__ << " warning: Passed an array with a null element at [" << i << "]. This is probably a mistake, so skipping\n";
        } else {
            <%- arg.name %>.Add(<%_ if (!arg.elementIsReference) { _%>*<%_ } _%><%- elementType %>::Unwrap(<%- arg.name %>_[i].ToObject())->_underlying);
        }
    }
<%_ } else if (arg.rawType == "const char *") { _%>
    const std::string <%- arg.name %> = info[<%- arg.cArg %>].ToString().Utf8Value();
<%_ } else if (arg.isEnum) { _%>
    const <%- arg.rawType %> <%- arg.name %> = static_cast<<%- arg.rawType %>>(info[<%- arg.cArg %>].ToNumber().Uint32Value());
<%_ } else { _%>
    <%_ if (arg.isOptional) { _%>
        <%- arg.rawType %> <%- arg.name %> = NULL;
        if (!(info[<%-arg.cArg %>].IsNull() || info[<%-arg.cArg %>].IsUndefined())) {
            const <%- cppType %> *<%- arg.name %>_ = <%- cppType %>::Unwrap(info[<%-arg.cArg %>].ToObject());
            <%- arg.name %> = <%- arg.name %>_->_underlying;
        } else {
            <%- arg.name %> = NULL;
        }
    <%_ } else { _%>
        if (info[<%-arg.cArg %>].IsNull() || info[<%-arg.cArg %>].IsUndefined()) {
            Napi::Error::New(env, "Passed null for non-optional parameter '<%- arg.name %>'").ThrowAsJavaScriptException();
            return;
        }
        const <%- arg.cppType %> *<%- arg.name %>_ = <%- arg.cppType %>::Unwrap(info[<%-arg.cArg %>].ToObject());
        <%_ if (arg.isPointer) { _%>
            <%- arg.rawType %> <%- arg.name %> = <%- arg.name %>_->_underlying;
        <%_ } else { _%>
            <%- arg.rawType %> &<%- arg.name %> = *<%- arg.name %>_->_underlying;
        <%_ } _%>
    <%_ } _%>
<%_ } _%>