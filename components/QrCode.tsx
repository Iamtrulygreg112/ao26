"use client";

import { useMemo } from "react";
import { toString as qrToString } from "qrcode";

/**
 * Renders `text` as an inline SVG QR code, generated locally (never fetched).
 * The SVG has only a viewBox, so it fills whatever box the parent gives it.
 */
export default function QrCode({ text, className = "" }: { text: string; className?: string }) {
  const svg = useMemo(() => {
    // The callback form runs synchronously, so the code is there on first paint.
    let out = "";
    qrToString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" }, (err, s) => {
      if (!err) out = s;
    });
    return out;
  }, [text]);

  if (!svg) return <p className="text-sm text-danger">Couldn&apos;t draw the code.</p>;

  return (
    <div
      role="img"
      aria-label="QR code to link Signal"
      className={`[&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
