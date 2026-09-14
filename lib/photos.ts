// Client-side photo compression for scheduled sends. Each photo becomes one
// Firestore doc holding base64, and Firestore refuses docs over 1 MiB, so the
// binary must stay ≤ 650 KB (≈ 870 KB as base64). Re-encoding through a
// canvas also strips EXIF (location etc.) as a side effect.

export const MAX_PHOTO_BYTES = 650 * 1024;

export type CompressedImage = {
  base64: string;
  bytes: number;
  width: number;
  height: number;
  /** The JPEG itself, handy for an object-URL thumbnail. */
  blob: Blob;
};

// Tried in order until the JPEG is small enough.
const LADDER: Array<{ maxEdge: number; quality: number }> = [
  { maxEdge: 1600, quality: 0.82 },
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1600, quality: 0.6 },
  { maxEdge: 1200, quality: 0.82 },
  { maxEdge: 1200, quality: 0.7 },
  { maxEdge: 1200, quality: 0.6 },
  { maxEdge: 1000, quality: 0.6 },
  { maxEdge: 800, quality: 0.6 },
];

async function loadSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the EXIF orientation so the canvas copy is upright.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path (older Safari, unusual formats).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sourceSize(src: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return src instanceof HTMLImageElement
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image"))), "image/jpeg", quality);
  });
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the image"));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name || "That file"} isn't an image.`);

  const src = await loadSource(file);
  const { width: sw, height: sh } = sourceSize(src);
  if (!sw || !sh) throw new Error(`Couldn't read ${file.name || "that image"}.`);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't available in this browser.");

  let drawnEdge = 0;
  try {
    for (const step of LADDER) {
      const scale = Math.min(1, step.maxEdge / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      if (drawnEdge !== step.maxEdge) {
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = "#fff"; // JPEG has no alpha; PNG transparency becomes white.
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(src, 0, 0, w, h);
        drawnEdge = step.maxEdge;
      }
      const blob = await toBlob(canvas, step.quality);
      if (blob.size <= MAX_PHOTO_BYTES) {
        return { base64: await toBase64(blob), bytes: blob.size, width: w, height: h, blob };
      }
    }
  } finally {
    if (!(src instanceof HTMLImageElement)) src.close();
    canvas.width = 0;
    canvas.height = 0;
  }
  throw new Error(`${file.name || "That image"} couldn't be compressed under 650 KB.`);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
