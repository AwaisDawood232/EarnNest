import fs from "fs/promises";

// confirms the file really is an image (not just a renamed file)
export async function isRealImage(path) {
  const fh = await fs.open(path, "r");
  const buf = Buffer.alloc(12);
  await fh.read(buf, 0, 12, 0);
  await fh.close();
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return jpeg || png || webp;
}

