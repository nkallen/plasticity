#include <sstream>
#include <stdio.h>

//------------------------------------------------------------------------------
// Реализация индикатора прогресса выполнения
// Implementation of the process and feedback indicator
// ---
class ProgressIndicatorImp : public IProgressIndicator, public GetMsgImp, public MbSyncItem {
private:
  size_t   count;
  string_t resMsg;
  string_t curMsg;
  bool     cancel;
public:
  ProgressIndicatorImp() : count( 0 ), resMsg(), curMsg(), cancel( false ) {}
  virtual ~ProgressIndicatorImp();

public:
  virtual bool          Initialize( size_t range, size_t delta, IStrData & msg ); // Установка диапазона индикации, сброс состояния
  virtual bool          Progress  ( size_t n );       // Обработать прогресс на n у.е. Вернет false - пора останавливаться
  virtual void          Success   ();                 // Ликвидация ошибок округления дорастим прогресс бар до 100%
  virtual bool          IsCancel  ();                 // Проверка не пора ли остановиться
  virtual void          SetCancel ( bool c );         // Скажем, что пора остановиться
  virtual void          Stop      ();                 // Команда пора остановиться
  virtual const TCHAR * Msg( IStrData & msg ) const;  // Получить строку

private:
  ProgressIndicatorImp( class ProgressIndicatorImp & );
  void operator =  ( class ProgressIndicatorImp & );
};


//------------------------------------------------------------------------------
// Деструктор
// Destructor
// ---
ProgressIndicatorImp::~ProgressIndicatorImp() {
}


//------------------------------------------------------------------------------
// Получить строку
// Get a string to indicate a state
// ---
const TCHAR * ProgressIndicatorImp::Msg( IStrData & strData ) const {
  return GetMsgImp::Msg( strData );
}

//------------------------------------------------------------------------------
// Послать строку в виде сообщения (потокобезопасная версия)
// Send a string as a message (thread-safe version)
// ---
void ShowStringSafe( const TCHAR * str )
{
  if ( !omp_in_parallel() || omp_get_thread_num() == 0 /*главный поток*/ )
    ::ShowString( str );
}

//------------------------------------------------------------------------------
// Установка диапазона индикации, сбросить состояние в 0
//
// Initialize range of the indicator and set it to the beginning
// ---
bool ProgressIndicatorImp::Initialize( size_t, size_t, IStrData & strData )
{
  Lock();
  count = 0;
  cancel = false;
  curMsg = Msg( strData );
  if ( curMsg.length() > 0 ) {
    TCHAR buff[20];
    resMsg = curMsg;
    resMsg += _T(" : ");
    _sntprintf( buff, 20, F_TD, count );
    resMsg += string_t( buff );
  }
  Unlock();
  if ( curMsg.length() > 0 )
    ::ShowStringSafe( (const TCHAR *)resMsg.c_str() );
  return true;
}


//------------------------------------------------------------------------------
// Обработать прогресс на n единиц. Вернет false - пора останавливаться
//
// Indicate progress by n units. If the returned value is false, converter 
// will stop the process
// ---
bool ProgressIndicatorImp::Progress( size_t n )
{
  Lock();
  count += n;
  TCHAR buff[20];
  resMsg = curMsg;
  resMsg += _T(" : ");
  _sntprintf( buff, 20, F_TD, count );
  resMsg += string_t( buff );
  Unlock();
  ::ShowStringSafe( (const TCHAR *)resMsg.c_str() );

  return !IsCancel();
}


//------------------------------------------------------------------------------
// Ликвидация ошибок округления дорастим прогресс бар до 100%
// Set the indicator to the "complete" state
// ---
void ProgressIndicatorImp::Success()
{
  Lock();
  count = 0;
  resMsg = curMsg;
  resMsg += string_t( RT_IS_FINISIED );
  Unlock();
  ::ShowStringSafe( (const TCHAR *)resMsg.c_str() );
}


//------------------------------------------------------------------------------
// Команда пора остановиться
// Здесь очистка строки состояния
// Set the indicator to the "stop" state
// ---
void ProgressIndicatorImp::Stop()
{
  string_t emptyMsg;
  size_t strLen = resMsg.length();
  for ( size_t k = 0; k <= strLen; k++ )
    emptyMsg += _T(" ");

  ::ShowStringSafe( emptyMsg.c_str() );
}


//------------------------------------------------------------------------------
// Проверка не пора ли остановиться
// Is it necessary to cancel the operation
// ---
bool ProgressIndicatorImp::IsCancel()
{
  if ( !cancel ) {
    if ( PeekEscape() )
      SetCancel( true );
  }
  return cancel;
}


//------------------------------------------------------------------------------
// Скажем, что пора остановиться.
// Set the indicator to the "stop" state
// ---
void ProgressIndicatorImp::SetCancel( bool c ) {
  cancel = c;
}


//------------------------------------------------------------------------------
// Создать индикатор прогресса выполнения
// Create the progress indicatior
// ---
IProgressIndicator & CreateProgressIndicator( BaseStrVisitor * strSpy ) {
  ProgressIndicatorImp * progInd = new ProgressIndicatorImp;
  progInd->SetStrSpy( strSpy );
  return *progInd;
}