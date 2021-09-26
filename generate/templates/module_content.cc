#include <iostream>     // std::cout, std::ios
#include <sstream>      // std::ostringstream

#include "../include/<%- klass.cppClassName %>.h"
#include "../include/Error.h"

#include "tool_mutex.h"

Napi::Object <%- klass.cppClassName %>::Init(Napi::Env env, Napi::Object exports) {
    Napi::Object object = Napi::Object::New(env);

    <%_ for (const func of klass.functions) { _%>
    object.Set("<%- func.jsName %>", Napi::Function::New<&<%- klass.cppClassName %>::<%- func.jsName %>>(env));
    object.Set("<%- func.jsName %>_async", Napi::Function::New<&<%- klass.cppClassName %>::<%- func.jsName %>_async>(env));
    <%_ } _%>

    exports.Set("<%- klass.cppClassName %>", object);

    return exports;
}

<%- include('functions.cc', klass) %>

<%- include('async_worker.cc') %>
