import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet } from "react-router";
export function Layout() {
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx("nav", { className: "border-b border-brand-border px-6 py-4", children: _jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between", children: [_jsx(Link, { to: "/", className: "text-xl font-bold text-brand-text", children: "Weather Agency" }), _jsxs("div", { className: "flex items-center gap-6 text-sm text-brand-subtitle", children: [_jsx(Link, { to: "/how-it-works", className: "hover:text-brand-text", children: "How it works" }), _jsx(Link, { to: "/suggest", className: "hover:text-brand-text", children: "Suggest a model" }), _jsx(Link, { to: "/login", className: "hover:text-brand-text", children: "Log in" })] })] }) }), _jsx("main", { className: "mx-auto max-w-6xl px-6 py-8", children: _jsx(Outlet, {}) })] }));
}
