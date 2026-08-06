"use client";

import { Download } from "lucide-react";

import { buildVCard, getVCardFileName } from "@/lib/vcard";

export default function DownloadContactButton({ profile, className }) {
  function downloadContact() {
    const publicProfileUrl = `${window.location.origin}/profile/${profile.usernameLower}`;
    const file = new Blob([buildVCard(profile, publicProfileUrl)], { type: "text/vcard;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(file);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = getVCardFileName(profile.usernameLower);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  return (
    <button className={className} type="button" onClick={downloadContact}>
      <Download size={17} aria-hidden="true" />
      Download Contact
    </button>
  );
}
