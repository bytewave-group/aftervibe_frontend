@echo off
setlocal
if "%SPOUT_SDK%"=="" (
  echo Set SPOUT_SDK to the Spout2 SDK root, the folder that contains SPOUTSDK.
  exit /b 1
)

set ROOT=%~dp0
set OUT=%ROOT%build
if not exist "%OUT%" mkdir "%OUT%"

set GL=%SPOUT_SDK%\SPOUTSDK\SpoutGL
set DX=%SPOUT_SDK%\SPOUTSDK\SpoutDirectX\SpoutDX
if not exist "%DX%\SpoutDX.cpp" (
  echo SpoutDX.cpp not found under %SPOUT_SDK%
  exit /b 1
)

set LIBDIR=%SPOUT_SDK%\SPOUTSDK\SpoutLibrary\Binaries
if not exist "%LIBDIR%\SpoutLibrary.dll" set LIBDIR=%SPOUT_SDK%\SPOUTSDK\SpoutLibrary\binaries\x64

cl /nologo /LD /EHsc /O2 /D_WIN32_WINNT=0x0601 /I"%GL%" /I"%DX%" /I"%SPOUT_SDK%\SPOUTSDK\SpoutLibrary" ^
  "%ROOT%spout_sender.cpp" ^
  "%DX%\SpoutDX.cpp" ^
  "%GL%\SpoutDirectX.cpp" ^
  "%GL%\SpoutSenderNames.cpp" ^
  "%GL%\SpoutFrameCount.cpp" ^
  "%GL%\SpoutCopy.cpp" ^
  "%GL%\SpoutUtils.cpp" ^
  "%GL%\SpoutSharedMemory.cpp" ^
  /Fo"%OUT%\\" /Fe"%OUT%\AfterVibeSpout.dll" ^
  /link d3d11.lib d3dcompiler.lib dxgi.lib dxguid.lib opengl32.lib user32.lib gdi32.lib winmm.lib comctl32.lib psapi.lib shlwapi.lib ole32.lib shell32.lib
if errorlevel 1 exit /b 1

if exist "%LIBDIR%\SpoutLibrary.dll" copy /Y "%LIBDIR%\SpoutLibrary.dll" "%OUT%\"

echo Built %OUT%\AfterVibeSpout.dll
