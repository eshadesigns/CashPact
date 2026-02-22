import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { ContractProvider } from "./ContractContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ContractProvider>
        <App />
      </ContractProvider>
    </BrowserRouter>
  </React.StrictMode>
);
