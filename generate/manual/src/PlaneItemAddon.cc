#include <iostream>
#include <sstream>

#include "../include/PlaneItem.h"
#include "../include/Region.h"
#include "../include/Contour.h"
#include "../include/LineSegment.h"
#include "../include/Arc.h"
#include "../include/Nurbs.h"
#include "../include/Polyline.h"
#include "../include/Hermit.h"
#include "../include/CubicSpline.h"
#include "../include/Line.h"
#include "../include/PolyCurve.h"
#include "../include/Bezier.h"
#include "../include/CubicSpline.h"
#include "../include/TrimmedCurve.h"
#include "../include/OffsetCurve.h"
#include "../include/ReparamCurve.h"

Napi::Value cast(MbPlaneItem *_underlying, const Napi::CallbackInfo &info)
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
    if (_underlying->IsA() != isa && _underlying->Family() != isa)
    {
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << "with family " << _underlying->Family() << " but trying to cast to " << isa << "\n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }

    switch (isa)
    {
    case pt_Line:
        return Line::NewInstance(env, (MbLine *)(_underlying));
    case pt_LineSegment:
        return LineSegment::NewInstance(env, (MbLineSegment *)(_underlying));
    case pt_Arc:
        return Arc::NewInstance(env, (MbArc *)(_underlying));
     case pt_PolyCurve:
        return PolyCurve::NewInstance(env, (MbPolyCurve *)(_underlying));
     case pt_Polyline:
        return Polyline::NewInstance(env, (MbPolyline *)(_underlying));
    case pt_Bezier:
        return Bezier::NewInstance(env, (MbBezier *)(_underlying));
    case pt_Hermit:
        return Hermit::NewInstance(env, (MbHermit *)(_underlying));
    case pt_Nurbs:
        return Nurbs::NewInstance(env, (MbNurbs *)(_underlying));
    case pt_CubicSpline:
        return CubicSpline::NewInstance(env, (MbCubicSpline *)(_underlying));
    case pt_TrimmedCurve:
        return TrimmedCurve::NewInstance(env, (MbTrimmedCurve *)(_underlying));
     case pt_OffsetCurve:
        return OffsetCurve::NewInstance(env, (MbOffsetCurve *)(_underlying));
     case pt_ReparamCurve:
        return ReparamCurve::NewInstance(env, (MbReparamCurve *)(_underlying));
    case pt_Region:
        return Region::NewInstance(env, (MbRegion *)(_underlying));
    case pt_Curve:
        return Curve::NewInstance(env, (MbCurve *)(_underlying));
     case pt_Contour:
        return Contour::NewInstance(env, (MbContour *)(_underlying));
   default:
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << " but trying to cast to " << isa << " -- perhaps change PlaneItemAddon.cc \n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value PlaneItem::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value PlaneItem::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Curve::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Curve::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}