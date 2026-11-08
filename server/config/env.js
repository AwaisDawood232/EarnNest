// import "dotenv/config";

// export const env = {
//   port: process.env.PORT || 5000,
//   clientUrl: process.env.CLIENT_URL,
//   firebase: {
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//   },
// };


import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to server/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
};