<%_ if (isNumber || isEnum) { _%>
    to = Napi::Number::New(env, <%- parsedName %>);
<%_ } else if (isBoolean) { _%>
    to = Napi::Boolean::New(env, <%- parsedName %>);
<%_ } else if (isArray) { _%>
    Napi::Array arr = Napi::Array::New(env);
    for (size_t i = 0; i < <%- parsedName %>->size(); i++) {
        arr[i] = <%- elementType %>::NewInstance(env, (*<%- parsedName %>)[i]);
    }
    to = arr;
<%_ } else if (isOnStack) { _%>
    to = <%- cppType %>::NewInstance(env, new <%- rawType %>(<%- parsedName %>));
<%_ } else { _%>
    if (<%- parsedName %> != NULL) {
        to = <%- cppType %>::NewInstance(env, <%_ if (constCast) _%>(<%- rawType %>)<%_ endif _%><%- parsedName %>);
    } else {
        to = env.Null();
    }
<%_ } _%>
