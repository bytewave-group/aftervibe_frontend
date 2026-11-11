"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type CSSProperties, type SyntheticEvent } from "react";

function isRemoteSrc(src: ImageProps["src"] | undefined): src is string {
  return typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"));
}

type SafeImageProps = ImageProps & {
  fallback?: string;
};

/**
 * Local assets still go through next/image. Absolute http(s) URLs are rendered
 * as a plain <img> so they do not depend on the /_next/image optimizer
 * allowlist (which rejects hosts missing from images.remotePatterns, and can
 * also block Herd's loopback host).
 */
export function SafeImage({
  fallback,
  src,
  alt,
  onError,
  fill,
  className,
  style,
  width,
  height,
  draggable,
  ...props
}: SafeImageProps) {
  const [current, setCurrent] = useState(src);
  const [seenSrc, setSeenSrc] = useState(src);

  if (src !== seenSrc) {
    setSeenSrc(src);
    setCurrent(src);
  }

  const displayed = current || fallback || "";
  const remote = isRemoteSrc(displayed);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[SafeImage] failed to load image", {
        src: current,
        fallback: fallback ?? null,
      });
    }
    if (fallback && current !== fallback) {
      setCurrent(fallback);
    }
    onError?.(event);
  };

  if (!displayed) {
    return null;
  }

  if (remote) {
    const remoteStyle: CSSProperties = fill
      ? {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          ...style,
        }
      : { ...style };

    return (
      // Remote URLs skip the optimizer on purpose. See file comment above.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displayed}
        alt={alt}
        className={className}
        style={remoteStyle}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        draggable={draggable}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={displayed}
      fill={fill}
      className={className}
      style={style}
      width={width}
      height={height}
      draggable={draggable}
      onError={handleError}
    />
  );
}
