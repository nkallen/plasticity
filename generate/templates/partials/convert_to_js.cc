<%_ if (arg.isNumber || arg.isEnum) { _%>
    _to = Napi::Number::New(env, <%- arg.name %>);
<%_ } else if (arg.isBoolean) { _%>
    _to = Napi::Boolean::New(env, <%- arg.name %>);
<%_ } else if (arg.isArray) { _%>
    Napi::Array arr = Napi::Array::New(env);
    for (size_t i = 0; i < <%- arg.name %>->size(); i++) {
        arr[i] = <%- arg.elementType.cppType %>::NewInstance(env, (*<%- arg.name %>)[i]);
    }
    _to = arr;
<%_ } else if (arg.isOnStack) { _%>
    _to = <%- arg.cppType %>::NewInstance(env, new <%- arg.rawType %>(<%- arg.name %>));
<%_ } else { _%>
    if (<%- arg.name %> != NULL) {
        _to = <%- arg.cppType %>::NewInstance(env, <% if (arg.const) { _%>(<%- arg.rawType %> <%- arg.ref %>)<%_ } _%><%- arg.name %>);
    } else {
        _to = env.Null();
    }
<%_ } _%>
