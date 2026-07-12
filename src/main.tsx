import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionProvider } from "./lib/clock";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </StrictMode>
);
