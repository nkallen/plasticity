// https://github.com/nodejs/node-addon-api/issues/231
#pragma once
#include <napi.h>

class PromiseWorker : public Napi::AsyncWorker {
public:
  PromiseWorker(Napi::Promise::Deferred const &d, const char *resource_name)
      : AsyncWorker(d.Env(), resource_name), deferred(d) {}
  PromiseWorker(Napi::Promise::Deferred const &d)
      : AsyncWorker(d.Env()), deferred(d) {}

  virtual void Resolve(Napi::Promise::Deferred const &deferred) = 0;

  void OnOK() override { Resolve(deferred); }

  void OnError(Napi::Error const &error) override { Reject(deferred, error); }

  virtual void Reject(Napi::Promise::Deferred const &deferred,
                      Napi::Error const &error) = 0;

private:
  Napi::Promise::Deferred deferred;
};