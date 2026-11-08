import fs from "fs/promises";

// confirms the file really is an MP4 or WEBM (not just a renamed file)
export async function isRealVideo(path) {
  const fh = await fs.open(path, "r");
  const buf = Buffer.alloc(12);
  await fh.read(buf, 0, 12, 0);
  await fh.close();
  const mp4 = buf.toString("ascii", 4, 8) === "ftyp";
  const webm = buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return mp4 || webm;
}
