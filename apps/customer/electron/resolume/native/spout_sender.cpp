// Windows Spout sender. Built by electron/resolume/native/build-windows.bat.
// Tries each available Spout backend and keeps the first one that registers.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>
#include <GL/gl.h>
#include "SpoutDX.h"
#include "SpoutLibrary.h"

enum AVSpoutBackend {
    AV_SPOUT_NONE = 0,
    AV_SPOUT_LIBRARY = 1,
    AV_SPOUT_DIRECTX = 2
};

struct AVSpoutSender {
    int backend;
    SPOUTHANDLE library;
    spoutDX *directX;
    unsigned int width;
    unsigned int height;
};

static char lastError[512] = "ok";
static char libraryError[256] = "not tried";
static char directXError[256] = "not tried";
static HMODULE spoutModule = nullptr;
static HWND glWindow = nullptr;
static HDC glDC = nullptr;
static HGLRC glContext = nullptr;

typedef SPOUTHANDLE (WINAPI *AvGetSpout)();

static void setError(const char *message) {
    snprintf(lastError, sizeof(lastError), "%s", message ? message : "unknown");
}

static void remember(char *slot, size_t size, const char *message) {
    snprintf(slot, size, "%s", message ? message : "unknown");
}

extern "C" __declspec(dllexport) const char *av_sender_last_error(void) {
    return lastError;
}

static bool ensureGL() {
    if (glContext && wglGetCurrentContext() == glContext) {
        return true;
    }

    if (!glWindow) {
        WNDCLASSW windowClass = {};
        windowClass.lpfnWndProc = DefWindowProcW;
        windowClass.hInstance = GetModuleHandleW(nullptr);
        windowClass.lpszClassName = L"AfterVibeSpoutGL";
        RegisterClassW(&windowClass);

        glWindow = CreateWindowW(
            windowClass.lpszClassName,
            L"AfterVibeSpoutGL",
            WS_POPUP,
            0,
            0,
            32,
            32,
            nullptr,
            nullptr,
            windowClass.hInstance,
            nullptr
        );
        if (!glWindow) {
            remember(libraryError, sizeof(libraryError), "OpenGL window failed");
            return false;
        }

        glDC = GetDC(glWindow);
        PIXELFORMATDESCRIPTOR descriptor = {};
        descriptor.nSize = sizeof(descriptor);
        descriptor.nVersion = 1;
        descriptor.dwFlags = PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER;
        descriptor.iPixelType = PFD_TYPE_RGBA;
        descriptor.cColorBits = 32;
        descriptor.cAlphaBits = 8;
        descriptor.cDepthBits = 24;

        const int format = ChoosePixelFormat(glDC, &descriptor);
        if (format == 0 || !SetPixelFormat(glDC, format, &descriptor)) {
            remember(libraryError, sizeof(libraryError), "OpenGL pixel format failed");
            return false;
        }

        glContext = wglCreateContext(glDC);
        if (!glContext) {
            remember(libraryError, sizeof(libraryError), "OpenGL context failed");
            return false;
        }
    }

    if (!wglMakeCurrent(glDC, glContext)) {
        remember(libraryError, sizeof(libraryError), "OpenGL make current failed");
        return false;
    }

    return true;
}

static AvGetSpout loadGetSpout() {
    if (spoutModule) {
        return reinterpret_cast<AvGetSpout>(GetProcAddress(spoutModule, "GetSpout"));
    }

    HMODULE self = nullptr;
    if (!GetModuleHandleExW(
        GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
            GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
        reinterpret_cast<LPCWSTR>(&loadGetSpout),
        &self
    )) {
        remember(libraryError, sizeof(libraryError), "AfterVibeSpout.dll module handle failed");
        return nullptr;
    }

    wchar_t path[MAX_PATH];
    const DWORD length = GetModuleFileNameW(self, path, MAX_PATH);
    if (length == 0 || length >= MAX_PATH) {
        remember(libraryError, sizeof(libraryError), "AfterVibeSpout.dll path failed");
        return nullptr;
    }

    wchar_t *slash = wcsrchr(path, L'\\');
    if (!slash || wcscpy_s(slash + 1, MAX_PATH - (slash + 1 - path), L"SpoutLibrary.dll") != 0) {
        remember(libraryError, sizeof(libraryError), "SpoutLibrary.dll path failed");
        return nullptr;
    }

    spoutModule = LoadLibraryW(path);
    if (!spoutModule) {
        remember(libraryError, sizeof(libraryError), "SpoutLibrary.dll not loaded");
        return nullptr;
    }

    AvGetSpout getSpout = reinterpret_cast<AvGetSpout>(GetProcAddress(spoutModule, "GetSpout"));
    if (!getSpout) {
        remember(libraryError, sizeof(libraryError), "GetSpout export missing");
    }
    return getSpout;
}

static int safeCreateSender(SPOUTHANDLE spout, const char *name, int width, int height) {
    __try {
        return spout->CreateSender(name, width, height, 0) ? 1 : 0;
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        return -1;
    }
}

static int safeLibrarySend(SPOUTHANDLE spout, const unsigned char *pixels, int width, int height) {
    __try {
        spout->SendImage(
            pixels,
            static_cast<unsigned int>(width),
            static_cast<unsigned int>(height),
            GL_BGRA,
            true
        );
        return 1;
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        return -1;
    }
}

static void safeLibraryRelease(SPOUTHANDLE spout) {
    __try {
        spout->ReleaseSender();
        spout->Release();
    } __except (EXCEPTION_EXECUTE_HANDLER) {
    }
}

static int safeDirectXSend(spoutDX *spout, const unsigned char *pixels, int width, int height) {
    __try {
        return spout->SendImage(
            pixels,
            static_cast<unsigned int>(width),
            static_cast<unsigned int>(height),
            static_cast<unsigned int>(width) * 4
        ) ? 1 : 0;
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        return -1;
    }
}

static SPOUTHANDLE openLibrary(const char *name, int width, int height, const unsigned char *blank) {
    AvGetSpout getSpout = loadGetSpout();
    if (!getSpout) {
        return nullptr;
    }

    SPOUTHANDLE spout = nullptr;
    __try {
        spout = getSpout();
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        spout = nullptr;
    }
    if (!spout) {
        remember(libraryError, sizeof(libraryError), "GetSpout returned null");
        return nullptr;
    }

    if (!ensureGL()) {
        safeLibraryRelease(spout);
        return nullptr;
    }

    const int created = safeCreateSender(spout, name, width, height);
    if (created != 1) {
        remember(
            libraryError,
            sizeof(libraryError),
            created == -1 ? "CreateSender crashed" : "CreateSender returned false"
        );
        safeLibraryRelease(spout);
        return nullptr;
    }

    safeLibrarySend(spout, blank, width, height);
    remember(libraryError, sizeof(libraryError), "ok");
    return spout;
}

static spoutDX *openDirectX(const char *name, int width, int height, const unsigned char *blank) {
    spoutDX *spout = new spoutDX();
    if (!spout->SetSenderName(name)) {
        remember(directXError, sizeof(directXError), "SetSenderName failed");
        delete spout;
        return nullptr;
    }

    const int sent = safeDirectXSend(spout, blank, width, height);
    if (sent != 1) {
        remember(
            directXError,
            sizeof(directXError),
            sent == -1 ? "SendImage crashed" : "SendImage returned false"
        );
        spout->ReleaseSender();
        delete spout;
        return nullptr;
    }

    remember(directXError, sizeof(directXError), "ok");
    return spout;
}

extern "C" __declspec(dllexport) void *av_sender_open(
    const char *name,
    int width,
    int height
) {
    if (width < 1 || height < 1) {
        setError("sender size is empty");
        return nullptr;
    }

    const char *senderName = name && name[0] ? name : "AfterVibeOverlay";
    const size_t bytes = static_cast<size_t>(width) * static_cast<size_t>(height) * 4;
    unsigned char *blank = static_cast<unsigned char *>(calloc(bytes, 1));
    if (!blank) {
        setError("out of memory");
        return nullptr;
    }

    SPOUTHANDLE library = openLibrary(senderName, width, height, blank);
    if (library) {
        free(blank);
        setError("ok spout-library");
        AVSpoutSender *sender = new AVSpoutSender();
        sender->backend = AV_SPOUT_LIBRARY;
        sender->library = library;
        sender->directX = nullptr;
        sender->width = static_cast<unsigned int>(width);
        sender->height = static_cast<unsigned int>(height);
        return sender;
    }

    spoutDX *directX = openDirectX(senderName, width, height, blank);
    free(blank);
    if (directX) {
        setError("ok spout-dx");
        AVSpoutSender *sender = new AVSpoutSender();
        sender->backend = AV_SPOUT_DIRECTX;
        sender->library = nullptr;
        sender->directX = directX;
        sender->width = static_cast<unsigned int>(width);
        sender->height = static_cast<unsigned int>(height);
        return sender;
    }

    snprintf(
        lastError,
        sizeof(lastError),
        "spout-library: %s; spout-dx: %s",
        libraryError,
        directXError
    );
    return nullptr;
}

extern "C" __declspec(dllexport) void av_sender_resize(
    void *handle,
    int width,
    int height
) {
    if (!handle || width < 1 || height < 1) {
        return;
    }

    AVSpoutSender *sender = static_cast<AVSpoutSender *>(handle);
    sender->width = static_cast<unsigned int>(width);
    sender->height = static_cast<unsigned int>(height);
}

extern "C" __declspec(dllexport) void av_sender_send(
    void *handle,
    const unsigned char *pixels,
    int width,
    int height
) {
    if (!handle || !pixels || width < 1 || height < 1) {
        return;
    }

    AVSpoutSender *sender = static_cast<AVSpoutSender *>(handle);
    if (sender->backend == AV_SPOUT_LIBRARY) {
        if (ensureGL()) {
            safeLibrarySend(sender->library, pixels, width, height);
        }
    } else if (sender->backend == AV_SPOUT_DIRECTX) {
        safeDirectXSend(sender->directX, pixels, width, height);
    }

    sender->width = static_cast<unsigned int>(width);
    sender->height = static_cast<unsigned int>(height);
}

extern "C" __declspec(dllexport) void av_sender_close(void *handle) {
    if (!handle) {
        return;
    }

    AVSpoutSender *sender = static_cast<AVSpoutSender *>(handle);
    if (sender->backend == AV_SPOUT_LIBRARY && sender->library) {
        safeLibraryRelease(sender->library);
    }
    if (sender->backend == AV_SPOUT_DIRECTX && sender->directX) {
        sender->directX->ReleaseSender();
        delete sender->directX;
    }
    delete sender;
}
