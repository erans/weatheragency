import { Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ModelDetail } from "./pages/ModelDetail";
import { HowItWorks } from "./pages/HowItWorks";
import { Suggest } from "./pages/Suggest";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { Verify } from "./pages/Verify";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="model/:slug" element={<ModelDetail />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="suggest" element={<Suggest />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="verify" element={<Verify />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
