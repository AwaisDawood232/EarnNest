import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { saveRefFromUrl } from "./utils/referral.js";

saveRefFromUrl();   // capture ?ref=CODE before any redirect happens

createRoot(document.getElementById("root")).render(<App />);