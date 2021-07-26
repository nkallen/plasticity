<%_ if (arg.isNumber || arg.isEnum || arg.isErrorCode) { _%>
    _to = Napi::Number::New(env, <%- (arg.isPointer) ? '*' : '' %><%- arg.name %>);
<%_ } else if (arg.isBoolean) { _%>
    _to = Napi::Boolean::New(env, <%- arg.name %>);
<%_ } else if (arg.isArray) { _%>
    Napi::Array arr_<%- arg.name %> = Napi::Array::New(env);
    for (size_t i = 0; i < <%- arg.name %>->Count(); i++) {
        arr_<%- arg.name %>[i] = <%- arg.elementType.cppType %>::NewInstance(env, <%- (arg.isStructArray && !arg.elementType.klass?.isPOD) ? "&" : '' %>(*<%- arg.name %>)[i]);
    }
    _to = arr_<%- arg.name %>;
<%_ } else if (arg.klass?.isPOD) { _%>
    _to = <%- arg.cppType %>::NewInstance(env, <%- arg.name %>);
<%_ } else if (!skipCopy && arg.isOnStack) { _%>
    _to = <%- arg.cppType %>::NewInstance(env, (<%- arg.rawType %> *)&(<%- arg.name %>));
<%_ } else { _%>
    if (<%- arg.name %> != NULL) {
        _to = <%- arg.cppType %>::NewInstance(env, (<%- arg.rawType %> *)<%- arg.name %>);
    } else {
        _to = env.Null();
    }
<%_ } _%>
