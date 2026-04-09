import { Link, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Layout() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-brand-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-brand-text">
            Weather Agency
          </Link>
          <div className="flex items-center gap-6 text-sm text-brand-subtitle">
            <Link to="/how-it-works" className="hover:text-brand-text">
              How it works
            </Link>
            <Link to="/suggest" className="hover:text-brand-text">
              Suggest a model
            </Link>
            {isLoggedIn ? (
              <Link to="/settings" className="hover:text-brand-text">
                Settings
              </Link>
            ) : (
              <Link to="/login" className="hover:text-brand-text">
                Log in
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
