"use client";

import Image from "next/image";
import { useState } from "react";

type CommodityImageProps = {
  alt: string;
  className: string;
  fallbackLabel?: string;
  height: number;
  priority?: boolean;
  sizes: string;
  src?: string;
  width: number;
};

export function CommodityImage({
  alt,
  className,
  fallbackLabel = "无图",
  height,
  priority = false,
  sizes,
  src,
  width
}: CommodityImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={`${className} commodity-image-fallback`} role="img" aria-label={fallbackLabel}>
        {fallbackLabel}
      </span>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      onError={() => setFailed(true)}
      priority={priority}
      sizes={sizes}
      src={src}
      unoptimized
      width={width}
    />
  );
}
