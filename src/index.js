import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const publicUrl = process.env.PUBLIC_URL || "";
document.documentElement.style.setProperty(
  "--tzp-bg-image",
  `url("${publicUrl}/assets/bg.jpg")`
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
