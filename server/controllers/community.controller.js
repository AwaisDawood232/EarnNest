import { z } from "zod";
import { getCommunityRaw, saveCommunity } from "../services/community.service.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

// 0300... becomes 92300..., "+92 300 ..." becomes 92300...
const normPhone = (s) => {
  let d = String(s || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "92" + d.slice(1);
  return d;
};

const CHANNEL = /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+\/?$/;
const GROUP = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/;

const schema = z.object({
  adminNumber: z
    .string()
    .trim()
    .transform(normPhone)
    .refine((v) => v === "" || /^\d{10,15}$/.test(v), "Enter a valid WhatsApp number with country code (e.g. 923001234567)"),
  adminMessage: z.string().trim().max(200, "The message is too long (200 characters max)"),
  channelUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || CHANNEL.test(v), "The channel link must look like https://whatsapp.com/channel/..."),
  groupUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || GROUP.test(v), "The group link must look like https://chat.whatsapp.com/..."),
});

export const adminGet = async (req, res, next) => {
  try {
    const { adminNumber, adminMessage, channelUrl, groupUrl } = await getCommunityRaw();
    res.json({ settings: { adminNumber, adminMessage, channelUrl, groupUrl } });
  } catch (err) {
    next(err);
  }
};

export const adminSave = async (req, res, next) => {
  try {
    const p = schema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    await saveCommunity(p.data, req.user.uid);
    res.json({ settings: p.data });
  } catch (err) {
    next(err);
  }
};

