export async function squareResize(file, size = 400, quality = 0.85) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";           // transparent PNGs get a white background
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, size, size);
  bmp.close?.();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality)
  );
}

