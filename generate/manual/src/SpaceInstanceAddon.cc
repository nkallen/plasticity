#include <iostream>
#include <sstream>

#include "../include/SpaceInstance.h"
#include "../include/SpaceItem.h"

// Napi::Value SpaceInstance::Duplicate(const Napi::CallbackInfo &info)
// {
//     Napi::Env env = info.Env();
//     MbSpaceInstance *instance = _underlying;
//     MbSpaceItem *item = instance->SetSpaceItem();
//     switch (item->Family())
//     {
//     case st_Curve3D: // FIXME: add other cases
//         MbCurve3D &curve = *((MbCurve3D *)item);
//         MbCurve3D &idup = (MbCurve3D &)curve.Duplicate();
//         return SpaceInstance::NewInstance(env,
//             new MbSpaceInstance(idup));
//     }
// }
