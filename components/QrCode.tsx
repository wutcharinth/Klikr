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
        boxShadow: "0 6px 22px -10px rgba(0,0,0,.45)",
        display: "inline-block",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
