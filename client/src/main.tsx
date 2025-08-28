import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register the service worker for PWA
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    console.log("New content available, refresh the page.");
  },
  onOfflineReady() {
    console.log("App ready to work offline.");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
