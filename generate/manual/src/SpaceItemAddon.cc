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
#include "../include/TrimmedCurve3D.h"
#include "../include/ConeSpiral.h"
#include "../include/CurveSpiral.h"
#include "../include/ContourOnSurface.h"
#include "../include/ContourOnPlane.h"
#include "../include/PlaneCurve.h"
#include "../include/PlaneInstance.h"
#include "../include/TorusSurface.h"
#include "../include/Plane.h"
#include "../include/SurfaceIntersectionCurve.h"
#include "../include/OffsetCurve3D.h"
#include "../include/ReparamCurve3D.h"
#include "../include/BridgeCurve3D.h"
#include "../include/Assembly.h"
#include "../include/PlaneCurve.h"
#include "../include/SurfaceCurve.h"
#include "../include/Instance.h"

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

    switch (isa)
    {
    case st_Assembly:
        return Assembly::NewInstance(env, dynamic_cast<MbAssembly *>(_underlying));
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
    case st_TrimmedCurve3D:
        return TrimmedCurve3D::NewInstance(env, (MbTrimmedCurve3D *)(_underlying));
    case st_ConeSpiral:
        return ConeSpiral::NewInstance(env, (MbConeSpiral *)(_underlying));
    case st_CurveSpiral:
        return CurveSpiral::NewInstance(env, (MbCurveSpiral *)(_underlying));
    case st_ContourOnSurface:
        return ContourOnSurface::NewInstance(env, (MbContourOnSurface *)(_underlying));
    case st_ContourOnPlane:
        return ContourOnPlane::NewInstance(env, (MbContourOnPlane *)(_underlying));
    case st_PlaneCurve:
        return PlaneCurve::NewInstance(env, (MbPlaneCurve *)(_underlying));
    case st_SurfaceCurve:
        return SurfaceCurve::NewInstance(env, (MbSurfaceCurve *)(_underlying));
    case st_OffsetCurve3D:
        return OffsetCurve3D::NewInstance(env, (MbOffsetCurve3D *)(_underlying));
    case st_ReparamCurve3D:
        return ReparamCurve3D::NewInstance(env, (MbReparamCurve3D *)(_underlying));
    case st_BridgeCurve3D:
        return BridgeCurve3D::NewInstance(env, (MbBridgeCurve3D *)(_underlying));

        // case st_WireFrame:
        //     return Item::NewInstance(env, dynamic_cast<MbWireFrame *>(_underlying));
        // default:
        //     Napi::Error::New(env, "Invalid cast parameter").ThrowAsJavaScriptException();
        //     return env.Undefined();
    case st_Item:
        return Item::NewInstance(env, (MbItem *)(_underlying));

    case st_PlaneInstance:
        return PlaneInstance::NewInstance(env, (MbPlaneInstance *)(_underlying));
    case st_TorusSurface:
        return TorusSurface::NewInstance(env, (MbTorusSurface *)(_underlying));
    case st_Plane:
        return Plane::NewInstance(env, (MbPlane *)(_underlying));
    case st_SurfaceIntersectionCurve:
        return SurfaceIntersectionCurve::NewInstance(env, (MbSurfaceIntersectionCurve *)(_underlying));
    case st_Instance:
        return Instance::NewInstance(env, (MbInstance *)(_underlying));
    default:
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << " but trying to cast to " << isa << "\n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
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

Napi::Value Surface::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Curve3D::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Polyline3D::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value PolyCurve3D::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Contour3D::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value PlaneCurve::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value LineSegment3D::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value SurfaceIntersectionCurve::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value ContourOnPlane::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

// THESE ARE FAKE ASYNC IMPLEMENTATIONS TO GET THE COMPILER TO STOP COMPLAINING

Napi::Value SpaceItem::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Item::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Surface::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Curve3D::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Polyline3D::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value PolyCurve3D::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Contour3D::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value PlaneCurve::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value LineSegment3D::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value SurfaceIntersectionCurve::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value ContourOnPlane::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}