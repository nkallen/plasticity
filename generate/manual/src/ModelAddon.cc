#include <iostream>
#include <sstream>

#include "../include/ModelAddon.h"

size_t WriteItems(const MbModel &model, const char *&memory)
{
    membuf memBuf;
    writer::writer_ptr wrt = writer::CreateMemWriter(memBuf, 0);
    ::WriteModelItems(*wrt, model);
    memBuf.closeBuff();

    uint64 bufsize = memBuf.getMemLen();

    memBuf.toMemory(memory);

    return bufsize;
}

void ReadItems(const void *memory, MbModel *&model)
{
    model = new MbModel();
    membuf memBuf;

    char *buffer = (char *)memory;
    memBuf.fromMemory(buffer);

    reader::reader_ptr rdr = reader::CreateMemReader(memBuf, 0);
    ::ReadModelItems(*rdr, *model);
}
