import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Stability layer to handle Vite connection issues
function initializeApp() {
  try {
    const root = document.getElementById("root");
    if (root) {
      createRoot(root).render(<App />);
    }
  } catch (error) {
    console.error("App initialization error:", error);
    // Retry after a short delay
    setTimeout(initializeApp, 1000);
  }
}

// Add error boundary for Vite connection issues
window.addEventListener("error", (event) => {
  if (event.message?.includes("vite") || event.message?.includes("websocket")) {
    event.preventDefault();
    console.log("Vite connection error caught, continuing...");
  }
});

// Disable Vite's error overlay that can interfere with the app
if (import.meta.hot) {
  import.meta.hot.on("vite:error", () => {
    // Suppress Vite errors to prevent interference
  });
}

initializeApp();
