import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App apiBaseUrl={import.meta.env.VITE_API_BASE_URL} />
  </StrictMode>,
);
