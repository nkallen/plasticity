#ifndef MODELADDON_H
#define MODELADDON_H

#include <sstream>
#include <stdio.h>

#include <model.h>

size_t WriteItems(const MbModel & model, const char *&memory);
void ReadItems(const void * memory, MbModel *& result);

#endif
