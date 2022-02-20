#pragma once

#include <sstream>
#include <stdio.h>

#include <napi.h>

#include <solid.h>
#include <topology_faceset.h>

class SolidDuplicate
{
public:
    SolidDuplicate(MbSolid &copy, const MbSolid &original) : copy(copy)
    {
        copy.AddRef();
        RPArray<MbFace> originalFaces;
        RPArray<MbFace> copyFaces;
        original.GetFaces(originalFaces);
        copy.GetFaces(copyFaces);

        const size_t count = originalFaces.Count();
        originalFaceIds = new uint64_t[count];
        copyFaceIds = new uint64_t[count];

        for (size_t i = 0; i < count; i++)
        {
            MbFace *originalFace = originalFaces[i];
            MbFace *copyFace = copyFaces[i];

            originalFaceIds[i] = (uint64_t)originalFace;
            copyFaceIds[i] = (uint64_t)copyFace;
        }
    }

    ~SolidDuplicate()
    {
        copy.Release();
        delete originalFaceIds;
        delete copyFaceIds;
    }


    MbSolid * GetCopy() {
        return &copy;
    }

    uint64_t *originalFaceIds;
    uint64_t *copyFaceIds;

private:
    MbSolid &copy;
};

class SolidPool
{
public:
    SolidPool(MbSolid &original) : original(original)
    {
        original.AddRef();
    }
    ~SolidPool()
    {
        original.Release();
    }

    void Alloc(size_t n)
    {
        std::vector<SolidDuplicate *> more;
        for (size_t i = 0; i < n; i++)
        {
            SolidDuplicate *copySolid = MakeOne();
            if (copySolid == nullptr)
                return;
            more.push_back(copySolid);
        }
        mutex.lock();
        copies = more;
        mutex.unlock();
    }

    SolidDuplicate *pop()
    {
        mutex.lock();
        if (copies.size() == 0)
        {
            mutex.unlock();
            std::cout << "Failures\n";
            return MakeOne();
        }
        else
        {
            SolidDuplicate *result = copies.back();
            copies.pop_back();
            mutex.unlock();
            return result;
        }
    }

    size_t Count() {
        return copies.size();
    }

private:
    const MbSolid &original;
    std::mutex mutex;

    std::vector<SolidDuplicate *> copies;

    SolidDuplicate *MakeOne()
    {
        MbFaceShell *originalShell = original.GetShell();
        if (originalShell == nullptr)
            return nullptr;

        const MbeCopyMode sameShell = cm_KeepSurface;
        MbFaceShell *copyShell = originalShell->Copy(sameShell);
        copyShell->SetOwnChangedThrough(tct_Unchanged);
        MbSolid *copySolid = new MbSolid(*copyShell, original, nullptr);

        return new SolidDuplicate(*copySolid, original);
    }
};
