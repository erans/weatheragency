import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import "./index.css";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 15_000,
            refetchInterval: 30_000,
        },
    },
});
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }) }));
