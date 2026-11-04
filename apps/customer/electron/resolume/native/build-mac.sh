#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
SRC="$ROOT/Syphon-Framework"
BUILD="$ROOT/build"
INCLUDE="$BUILD/include"

mkdir -p "$BUILD" "$INCLUDE/Syphon"

if [ ! -d "$SRC/.git" ]; then
  git clone --depth 1 https://github.com/Syphon/Syphon-Framework.git "$SRC"
fi

for header in "$SRC"/*.h; do
  ln -sfn "$header" "$INCLUDE/Syphon/$(basename "$header")"
done

OBJECTS=""

for source in "$SRC"/*.m; do
  case "$(basename "$source")" in
    *Metal*) continue ;;
  esac
  object="$BUILD/$(basename "${source%.m}").o"
  clang \
    -c \
    -fobjc-arc \
    -arch arm64 \
    -mmacosx-version-min=11.0 \
    -DGL_SILENCE_DEPRECATION \
    -Wno-deprecated-declarations \
    -include "$ROOT/syphon_compat.h" \
    -I "$INCLUDE" \
    -o "$object" \
    "$source"
  OBJECTS="$OBJECTS $object"
done

for source in "$SRC"/*.c; do
  object="$BUILD/$(basename "${source%.c}").o"
  clang \
    -c \
    -arch arm64 \
    -mmacosx-version-min=11.0 \
    -DGL_SILENCE_DEPRECATION \
    -Wno-deprecated-declarations \
    -I "$INCLUDE" \
    -o "$object" \
    "$source"
  OBJECTS="$OBJECTS $object"
done

sender_object="$BUILD/syphon_sender.o"
clang \
  -c \
  -fobjc-arc \
  -fvisibility=default \
  -arch arm64 \
  -mmacosx-version-min=11.0 \
  -DGL_SILENCE_DEPRECATION \
  -Wno-deprecated-declarations \
  -I "$INCLUDE" \
  -o "$sender_object" \
  "$ROOT/syphon_sender.m"

# shellcheck disable=SC2086
clang \
  -dynamiclib \
  -fvisibility=default \
  -arch arm64 \
  -mmacosx-version-min=11.0 \
  -framework OpenGL \
  -framework AppKit \
  -framework Foundation \
  -framework IOSurface \
  -framework CoreVideo \
  -framework QuartzCore \
  -o "$BUILD/libAfterVibeSyphon.dylib" \
  $OBJECTS \
  "$sender_object"

install_name_tool -id "@rpath/libAfterVibeSyphon.dylib" "$BUILD/libAfterVibeSyphon.dylib"

echo "Built $BUILD/libAfterVibeSyphon.dylib"
