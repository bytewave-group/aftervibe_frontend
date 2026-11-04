const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let binding = null;
let loadFailed = false;

function nativeLibraryPath() {
    const fileName = process.platform === "darwin"
        ? "libAfterVibeSyphon.dylib"
        : process.platform === "win32"
            ? "AfterVibeSpout.dll"
            : null;

    if (!fileName) {
        return null;
    }

    if (app.isPackaged) {
        return path.join(
            process.resourcesPath,
            "app.asar.unpacked",
            "electron",
            "resolume",
            "native",
            "build",
            fileName
        );
    }

    return path.join(__dirname, "native", "build", fileName);
}

function loadBinding() {
    if (binding || loadFailed) {
        return binding;
    }

    const libraryPath = nativeLibraryPath();

    if (!libraryPath || !fs.existsSync(libraryPath)) {
        loadFailed = true;
        console.error(
            "RESOLUME SENDER LIBRARY MISSING =",
            libraryPath || process.platform
        );
        writeLog(`SENDER LIBRARY MISSING ${libraryPath || process.platform}`);
        return null;
    }

    try {
        const koffi = require("koffi");
        const lib = koffi.load(libraryPath);

        binding = {
            open: lib.func(
                "void *av_sender_open(const char *name, int width, int height)"
            ),
            resize: lib.func(
                "void av_sender_resize(void *handle, int width, int height)"
            ),
            send: lib.func(
                "void av_sender_send(void *handle, uint8_t *pixels, int width, int height)"
            ),
            close: lib.func("void av_sender_close(void *handle)"),
            lastError: optionalFunc(lib, "const char *av_sender_last_error()"),
        };

        console.log("RESOLUME SENDER LIBRARY =", libraryPath);
        return binding;
    } catch (error) {
        loadFailed = true;
        console.error("RESOLUME SENDER LOAD FAILED =", error.message);
        writeLog(`SENDER LOAD FAILED ${libraryPath} ${error.message}`);
        return null;
    }
}

// The Syphon build (macOS) does not export av_sender_last_error; only the Spout build (Windows) does.
function optionalFunc(lib, signature) {
    try {
        return lib.func(signature);
    } catch (error) {
        return () => null;
    }
}

function writeLog(message) {
    try {
        const file = path.join(app.getPath("userData"), "aftervibe.log");
        fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`);
    } catch (error) {
        console.error("RESOLUME LOG FAILED =", error.message);
    }
}

function createSender(name) {
    let handle = null;
    let width = 0;
    let height = 0;
    let openFailed = false;

    function ensure(nextWidth, nextHeight) {
        const api = loadBinding();

        if (!api || !nextWidth || !nextHeight || openFailed) {
            return false;
        }

        if (!handle) {
            handle = api.open(name, nextWidth, nextHeight);
            width = nextWidth;
            height = nextHeight;

            if (!handle) {
                openFailed = true;
                let reason = "unknown";
                try {
                    reason = api.lastError() || reason;
                } catch (error) {
                    reason = error.message;
                }
                console.error("RESOLUME SENDER OPEN FAILED =", name, reason);
                writeLog(`SENDER OPEN FAILED ${name} ${nextWidth}x${nextHeight} ${reason}`);
                return false;
            }

            let backend = "";
            try {
                backend = api.lastError() || "";
            } catch (error) {
                backend = "";
            }
            writeLog(`SENDER OPEN ${name} ${nextWidth}x${nextHeight} ${backend}`);

            console.log(
                "RESOLUME SENDER OPEN =",
                name,
                nextWidth,
                nextHeight,
                process.platform === "win32" ? "Spout" : "Syphon"
            );
            return true;
        }

        if (width !== nextWidth || height !== nextHeight) {
            api.resize(handle, nextWidth, nextHeight);
            width = nextWidth;
            height = nextHeight;
            console.log("RESOLUME SENDER RESIZE =", name, nextWidth, nextHeight);
        }

        return true;
    }

    return {
        open(nextWidth, nextHeight) {
            ensure(nextWidth, nextHeight);
        },
        send(image) {
            if (!image || typeof image.getBitmap !== "function") {
                return;
            }

            const size = image.getSize();

            if (!ensure(size.width, size.height)) {
                return;
            }

            const bitmap = image.getBitmap();
            loadBinding().send(handle, bitmap, size.width, size.height);
        },
        close() {
            if (!handle) {
                return;
            }

            const api = loadBinding();

            if (api) {
                api.close(handle);
            }

            handle = null;
        },
    };
}

module.exports = {
    createSender,
    nativeLibraryPath,
};
