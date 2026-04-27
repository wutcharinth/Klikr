"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({
  value,
  size = 180,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(() => {});
  }, [value, size]);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        padding: 10,
        background: "#ffffff",
        borderRadius: 14,
        boxShadow: "0 8px 28px -16px rgba(0,0,0,.55)",
        boxSizing: "border-box",
        display: "block",
        flexShrink: 0,
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
