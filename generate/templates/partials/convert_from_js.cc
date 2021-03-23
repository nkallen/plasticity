<%_ if (rawType == "double") { _%>
    const double <%- name }} = info[<%- cArg }}].ToNumber().DoubleValue();
<%_ } else if (rawType == "int") { _%>
    const int <%- name }} = info[<%- cArg }}].ToNumber().Int64Value();
<%_ } else if (rawType == "bool") { _%>
    const bool <%- name }} = info[<%- cArg }}].ToBoolean();
<%_ } else if (jsType == "Array") { _%>
    const Napi::Array <%- name }}_ = Napi::Array(env, info[<%- cArg %>]);
    <%- rawType -%> <%- name %> = <%- rawType -%>(<%- name %>_.Length(), 1);
    for (size_t i = 0; i < <%- name %>_.Length(); i++) {
        if (<%- name %>_[i].IsNull() || <%- name %>_[i].IsUndefined()) {
            std::cerr << __FILE__ << ":" << __LINE__ << " warning: Passed an array with a null element at [" << i << "]. This is probably a mistake, so skipping\n";
        } else {
            <%- name %>.Add(<%_ if not elementIsReference _%>*<%_ } _%><%- elementType %>::Unwrap(<%- name %>_[i].ToObject())->_underlying);
        }
    }
<%_ } else if (rawType == "const char *") { _%>
    const std::string <%- name %> = info[<%- cArg %>].ToString().Utf8Value();
<%_ } else if (isEnum) { _%>
    const <%- rawType %> <%- name %> = static_cast<<%- rawType %>>(info[<%- cArg %>].ToNumber().Uint32Value());
<%_ } else { _%>
    <%_ if (isOptional) _%>
        <%- rawType -%> <%- name %> = NULL;
        if (!(info[<%-cArg %>].IsNull() || info[<%-cArg %>].IsUndefined())) {
            const <%- cppType %> *<%- name %>_ = <%- cppType %>::Unwrap(info[<%-cArg %>].ToObject());
            <%- name %> = <%- name %>_->_underlying;
        } else {
            <%- name %> = NULL;
        }
    <%_ else _%>
        if (info[<%-cArg %>].IsNull() || info[<%-cArg %>].IsUndefined()) {
            Napi::Error::New(env, "Passed null for non-optional parameter '<%- name %>'").ThrowAsJavaScriptException();
            return;
        }
        const <%- cppType %> *<%- name %>_ = <%- cppType %>::Unwrap(info[<%-cArg %>].ToObject());
        <%_ if rawType | isPointer _%>
            <%- rawType -%> <%- name %> = <%- name %>_->_underlying;
        <%_ else _%>
            <%- rawType -%> &<%- name %> = *<%- name %>_->_underlying;
        <%_ } _%>
    <%_ } _%>
<%_ } _%>