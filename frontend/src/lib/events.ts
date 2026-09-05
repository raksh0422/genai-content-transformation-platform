export function openUploadModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-upload-modal"));
  }
}
