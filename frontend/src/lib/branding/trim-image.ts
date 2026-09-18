/** Trim near-transparent edges so oversized canvases don't render as a speck. */
export async function trimImageDataUrl(dataUrl: string, padding = 8): Promise<string> {
  const img = await loadImage(dataUrl);
  const source = document.createElement("canvas");
  source.width = img.naturalWidth || img.width;
  source.height = img.naturalHeight || img.height;
  if (source.width < 2 || source.height < 2) return dataUrl;

  const ctx = source.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);

  const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha < 10) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return dataUrl;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Already tight enough — don't re-encode.
  if (cropW >= width * 0.92 && cropH >= height * 0.92) return dataUrl;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext("2d");
  if (!outCtx) return dataUrl;
  outCtx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
