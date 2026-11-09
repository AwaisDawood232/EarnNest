

import app from "./app.js";
import { env } from "../config/env.js";
import { creditAllDue } from "../services/reward.service.js";

app.listen(env.port, "0.0.0.0", () => {
  console.log(`API running on port ${env.port}`);
});

// Pay due daily rewards on startup and then every 5 minutes
const sweep = () =>
  creditAllDue().catch((e) =>
    console.error("Reward sweep failed:", e.message)
  );

sweep();

setInterval(sweep, 5 * 60 * 1000);