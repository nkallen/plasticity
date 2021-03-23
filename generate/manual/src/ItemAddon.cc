#include "../include/Item.h"

Napi::Value Item::Cast(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() != 1) {
        Napi::Error::New(env, "Expecting 1 parameters").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    if (!info[0].IsNumber()) {
        Napi::Error::New(env, "Parameter 0 must be number").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    switch (info[0].ToNumber().Uint32Value()) {
        // case st_Assembly:
        //     return Item::NewInstance(env, dynamic_cast<MbAssembly *>(_underlying));
        // case st_AssistedItem:
        //     return Item::NewInstance(env, dynamic_cast<MbAssistingItem *>(_underlying));
        // case st_Collection:
        //     return Item::NewInstance(env, dynamic_cast<MbCollection *>(_underlying));
        // case st_Instance:
        //     return Item::NewInstance(env, dynamic_cast<MbInstance *>(_underlying));
        case st_Mesh:
            return Mesh::NewInstance(env, dynamic_cast<MbMesh *>(_underlying));
        // case st_PlaneInstance:
        //     return Item::NewInstance(env, dynamic_cast<MbPlaneInstance *>(_underlying));
        // case st_PointFrame:
        //     return Item::NewInstance(env, dynamic_cast<MbPointFrame *>(_underlying));
        case st_Solid:
            return Solid::NewInstance(env, dynamic_cast<MbSolid *>(_underlying));
        // case st_SpaceInstance:
        //     return Item::NewInstance(env, dynamic_cast<MbSpaceInstance *>(_underlying));
        // case st_WireFrame:
        //     return Item::NewInstance(env, dynamic_cast<MbWireFrame *>(_underlying));
        // default:
        //     Napi::Error::New(env, "Invalid cast parameter").ThrowAsJavaScriptException();
        //     return env.Undefined();
    }
}