import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register lightweight service worker that clears caches on install
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw-clear.js')
      .then(() => console.log('[SW] sw-clear registered'))
      .catch((err) => console.warn('[SW] registration failed', err));
  });
}
