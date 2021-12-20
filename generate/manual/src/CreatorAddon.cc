#include <iostream>
#include <sstream>

#include "../include/Creator.h"
#include "../include/SimpleCreator.h"
#include "../include/ElementarySolid.h"
#include "../include/CurveSweptSolid.h"
#include "../include/CurveExtrusionSolid.h"
#include "../include/CurveRevolutionSolid.h"
#include "../include/CurveEvolutionSolid.h"
#include "../include/CurveLoftedSolid.h"
#include "../include/BooleanSolid.h"
#include "../include/CuttingSolid.h"
#include "../include/SymmetrySolid.h"
#include "../include/HoleSolid.h"
#include "../include/ChamferSolid.h"
#include "../include/FilletSolid.h"
#include "../include/ShellSolid.h"
#include "../include/DraftSolid.h"
#include "../include/RibSolid.h"
#include "../include/SplitShell.h"
#include "../include/NurbsBlockSolid.h"
#include "../include/FaceModifiedSolid.h"
#include "../include/ModifiedNurbsItem.h"
#include "../include/ShellSolid.h"
// #include "../include/NurbsModification.h"
#include "../include/TransformedSolid.h"
#include "../include/ThinShellCreator.h"
#include "../include/UnionSolid.h"
#include "../include/DetachSolid.h"
#include "../include/DuplicationSolid.h"
#include "../include/ReverseCreator.h"
#include "../include/TransformationMaker.h"
#include "../include/ExtensionShell.h"

Napi::Value cast(MbCreator *_underlying, const Napi::CallbackInfo &info)
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
    if (_underlying->IsA() != isa)
    {
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << " but trying to cast to " << isa << "\n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }

    switch (isa)
    {
    case ct_SimpleCreator:
        return SimpleCreator::NewInstance(env, (MbSimpleCreator *)(_underlying));
    case ct_ElementarySolid:
        return ElementarySolid::NewInstance(env, (MbElementarySolid *)(_underlying));
    case ct_CurveSweptSolid:
        return CurveSweptSolid::NewInstance(env, (MbCurveSweptSolid *)(_underlying));
    case ct_CurveExtrusionSolid:
        return CurveExtrusionSolid::NewInstance(env, (MbCurveExtrusionSolid *)(_underlying));
    case ct_CurveRevolutionSolid:
        return CurveRevolutionSolid::NewInstance(env, (MbCurveRevolutionSolid *)(_underlying));
    case ct_CurveEvolutionSolid:
        return CurveEvolutionSolid::NewInstance(env, (MbCurveEvolutionSolid *)(_underlying));
    case ct_CurveLoftedSolid:
        return CurveLoftedSolid::NewInstance(env, (MbCurveLoftedSolid *)(_underlying));
    case ct_BooleanSolid:
        return BooleanSolid::NewInstance(env, (MbBooleanSolid *)(_underlying));
    case ct_CuttingSolid:
        return CuttingSolid::NewInstance(env, (MbCuttingSolid *)(_underlying));
    case ct_SymmetrySolid:
        return SymmetrySolid::NewInstance(env, (MbSymmetrySolid *)(_underlying));
    case ct_HoleSolid:
        return HoleSolid::NewInstance(env, (MbHoleSolid *)(_underlying));
    case ct_SmoothSolid:
        return SmoothSolid::NewInstance(env, (MbSmoothSolid *)(_underlying));
    case ct_ChamferSolid:
        return ChamferSolid::NewInstance(env, (MbChamferSolid *)(_underlying));
    case ct_FilletSolid:
        return FilletSolid::NewInstance(env, (MbFilletSolid *)(_underlying));
    // case ct_FullFilletSolid:
    // return FullFilletSolid::NewInstance(env, (MbFullFilletSolid *)(_underlying));
    case ct_ShellSolid:
        return ShellSolid::NewInstance(env, (MbShellSolid *)(_underlying));
    case ct_DraftSolid:
        return DraftSolid::NewInstance(env, (MbDraftSolid *)(_underlying));
    case ct_RibSolid:
        return RibSolid::NewInstance(env, (MbRibSolid *)(_underlying));
    case ct_SplitShell:
        return SplitShell::NewInstance(env, (MbSplitShell *)(_underlying));
    case ct_NurbsBlockSolid:
        return NurbsBlockSolid::NewInstance(env, (MbNurbsBlockSolid *)(_underlying));
    case ct_FaceModifiedSolid:
        return FaceModifiedSolid::NewInstance(env, (MbFaceModifiedSolid *)(_underlying));
    case ct_ModifiedNurbsItem:
        return ModifiedNurbsItem::NewInstance(env, (MbModifiedNurbsItem *)(_underlying));
    // case ct_NurbsModification:
    // return NurbsModification::NewInstance(env, (MbNurbsModification *)(_underlying));
    case ct_TransformedSolid:
        return TransformedSolid::NewInstance(env, (MbTransformedSolid *)(_underlying));
    case ct_ThinShellCreator:
        return ThinShellCreator::NewInstance(env, (MbThinShellCreator *)(_underlying));
    case ct_UnionSolid:
        return UnionSolid::NewInstance(env, (MbUnionSolid *)(_underlying));
    case ct_DetachSolid:
        return DetachSolid::NewInstance(env, (MbDetachSolid *)(_underlying));
    case ct_DuplicationSolid:
        return DuplicationSolid::NewInstance(env, (MbDuplicationSolid *)(_underlying));
    case ct_ReverseCreator:
        return ReverseCreator::NewInstance(env, (MbReverseCreator *)(_underlying));
    case ct_TransformationMaker:
        return TransformationMaker::NewInstance(env, (MbTransformationMaker *)(_underlying));
    case ct_ExtensionShell:
        return ExtensionShell::NewInstance(env, (MbExtensionShell *)(_underlying));
    default:
        std::ostringstream msg;
        msg << "Operation Cast failed: object is a " << _underlying->IsA() << " but trying to cast to " << isa << "\n";
        Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value Creator::Cast(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}

Napi::Value Creator::Cast_async(const Napi::CallbackInfo &info)
{
    return cast(this->_underlying, info);
}
