import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Production: call Supabase Edge Functions directly (skip Vercel API hop → lower latency).
// Development: use relative /api (Vite dev server proxies to Express).
const viteApiBase = import.meta.env.VITE_API_BASE as string | undefined;
if (viteApiBase) {
  setBaseUrl(viteApiBase);
} else if (import.meta.env.PROD) {
  setBaseUrl("https://vuywhhmwrqykukcemifd.supabase.co/functions/v1");
}

createRoot(document.getElementById("root")!).render(<App />);
