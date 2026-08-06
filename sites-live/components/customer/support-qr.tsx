"use client";

import { useEffect, useState } from "react";

export default function SupportQr({ value, label }: { value: string; label: string }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(value, {
      width: 176,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#050505", light: "#ffffff" },
    })).then((dataUrl) => {
      if (!cancelled) setSource(dataUrl);
    }).catch(() => {
      if (!cancelled) setSource("");
    });
    return () => { cancelled = true; };
  }, [value]);

  return <span className="support-qr">{source ? <img src={source} width="176" height="176" alt={`QR code for ${label}`} /> : <i aria-label="Generating QR code" />}</span>;
}
