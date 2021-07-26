#include <iostream>
#include <sstream>

#include "../include/SpaceItem.h"
#include "../include/Item.h"
#include "../include/Solid.h"
#include "../include/Mesh.h"
#include "../include/SpaceInstance.h"
#include "../include/PolyCurve3D.h"
#include "../include/Polyline3D.h"
#include "../include/Bezier3D.h"
#include "../include/CubicSpline3D.h"
#include "../include/Hermit3D.h"
#include "../include/Nurbs3D.h"
#include "../include/LineSegment3D.h"
#include "../include/Arc3D.h"
#include "../include/Contour3D.h"

Napi::Value cast(MbSpaceItem *_underlying, const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (info.Length() != 1)
    {
        Napi::Error::New(env, "Expecting 1 parameters").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    if (!info[0].IsNumber())
    {
        Napi::Error::New(env, "Parameter 0 must be number").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    const uint isa = info[0].ToNumber().Uint32Value();
    if (_underlying->IsA() != isa && _underlying->Family() != isa && _underlying->Type() != isa)
    {
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << " with family " << _underlying->Family() << " but trying to cast to " << isa << "\n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }

    _underlying->AddRef();
    switch (isa)
    {
    // case st_Assembly:
    //     return Item::NewInstance(env, dynamic_cast<MbAssembly *>(_underlying));
    // case st_AssistedItem:
    //     return Item::NewInstance(env, dynamic_cast<MbAssistingItem´ *>(_underlying));
    // case st_Collection:
    //     return Item::´NewInstance(env, dynamic_cast<MbCollection *>(_underlying));
    // case st_Instance:
    //     return Item::NewInstance(env, dynamic_cast<MbInstance *>(_underlying));
    case st_Mesh:
        return Mesh::NewInstance(env, (MbMesh *)(_underlying));
    // case st_PlaneInstance:
    //     return Item::NewInstance(env, dynamic_cast<MbPlaneInstance *>(_underlying));
    // case st_PointFrame:
    //     return Item::NewInstance(env, dynamic_cast<MbPointFrame *>(_underlying));
    case st_Solid:
        return Solid::NewInstance(env, (MbSolid *)(_underlying));
    case st_SpaceInstance:
        return SpaceInstance::NewInstance(env, (MbSpaceInstance *)(_underlying));
    case st_Curve3D:
        return Curve3D::NewInstance(env, (MbCurve3D *)(_underlying));
    case st_PolyCurve3D:
        return PolyCurve3D::NewInstance(env, (MbPolyCurve3D *)(_underlying));
    case st_Bezier3D:
        return Bezier3D::NewInstance(env, (MbBezier3D *)(_underlying));
    case st_CubicSpline3D:
        return CubicSpline3D::NewInstance(env, (MbCubicSpline3D *)(_underlying));
    case st_Hermit3D:
        return Hermit3D::NewInstance(env, (MbHermit3D *)(_underlying));
    case st_Nurbs3D:
        return Nurbs3D::NewInstance(env, (MbNurbs3D *)(_underlying));
    case st_Polyline3D:
        return Polyline3D::NewInstance(env, (MbPolyline3D *)(_underlying));
    case st_LineSegment3D:
        return LineSegment3D::NewInstance(env, (MbLineSegment3D *)(_underlying));
    case st_Arc3D:
        return Arc3D::NewInstance(env, (MbArc3D *)(_underlying));
    case st_Contour3D:
        return Contour3D::NewInstance(env, (MbContour3D *)(_underlying));

        // case st_WireFrame:
        //     return Item::NewInstance(env, dynamic_cast<MbWireFrame *>(_underlying));
        // default:
        //     Napi::Error::New(env, "Invalid cast parameter").ThrowAsJavaScriptException();
        //     return env.Undefined();
    case st_Item:
        return Item::NewInstance(env, (MbItem *)(_underlying));
    default:
        Napi::Error::New(env, "Invalid cast parameter").ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value SpaceItem::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Item::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

// Napi::Value SpaceItem::Duplicate(const Napi::CallbackInfo &info)
// {
//     Napi::Env env = info.Env();
//     MbSpaceItem *item = _underlying;
//     MbSpaceItem * dup =  static_cast<MbSpaceItem *>( &item->Duplicate() );
//     return SpaceItem::NewInstance(env, dup);
// }
