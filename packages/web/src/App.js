import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ModelDetail } from "./pages/ModelDetail";
import { HowItWorks } from "./pages/HowItWorks";
import { Suggest } from "./pages/Suggest";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";
export function App() {
    return (_jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "model/:slug", element: _jsx(ModelDetail, {}) }), _jsx(Route, { path: "how-it-works", element: _jsx(HowItWorks, {}) }), _jsx(Route, { path: "suggest", element: _jsx(Suggest, {}) }), _jsx(Route, { path: "register", element: _jsx(Register, {}) }), _jsx(Route, { path: "login", element: _jsx(Login, {}) }), _jsx(Route, { path: "settings", element: _jsx(Settings, {}) })] }) }));
}
