#include <iostream>     // std::cout, std::ios
#include <sstream>      // std::ostringstream

#include "../../include/{{ cppClassName }}.h"
#include "../../include/Error.h"

Napi::Object {{ cppClassName }}::Init(Napi::Env env, Napi::Object exports) {
    Napi::Object object = Napi::Object::New(env);

    {% each functions as function %}
    {% if not function.ignore %}
    object.Set("{{ function.cppFunctionName }}", Napi::Function::New<&{{ cppClassName }}::{{ function.cppFunctionName }}>(env));
    {% endif %}
    {% endeach %}

    exports.Set("{{ cppClassName }}", object);

    return exports;
}

{% partial functions . %}