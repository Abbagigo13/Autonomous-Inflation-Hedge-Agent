import React from "react";
import ReactDOM from "react-dom/client";
import { AgentProvider } from "@/context/AgentContext";
import { Dashboard } from "@/components/Dashboard";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AgentProvider><Dashboard /></AgentProvider>
  </React.StrictMode>
);
