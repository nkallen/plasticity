#include <napi.h>
<%_ for (c of classes) { _%>
//include "./include/<%- c.cppClassName %>.h"
<%_ } _%>

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::ObjectReference* ref = new Napi::ObjectReference();
    *ref = Napi::Persistent(exports);
    env.SetInstanceData<Napi::ObjectReference>(ref);
    
    <%_ for (c of classes) { _%>
    // <%- c.cppClassName %>::Init(env, exports);
    <%_ } _%>

    return exports;
}

// Register and initialize native add-on
NODE_API_MODULE(greet, Init)
