import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyMagicLink } = useAuth();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token && !verifyMagicLink.isPending && !verifyMagicLink.isSuccess && !verifyMagicLink.isError) {
      verifyMagicLink.mutate(token);
    }
  }, [token]);

  useEffect(() => {
    if (verifyMagicLink.isSuccess) {
      // Scrub token from URL for security
      window.history.replaceState({}, "", "/verify");
      navigate("/settings", { replace: true });
    }
  }, [verifyMagicLink.isSuccess]);

  if (!token) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Invalid Link</h1>
        <p className="text-brand-subtitle">This login link is missing a token.</p>
      </div>
    );
  }

  if (verifyMagicLink.isError) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Link Expired</h1>
        <p className="mb-4 text-brand-subtitle">{verifyMagicLink.error.message}</p>
        <a href="/login" className="text-sm text-brand-text underline">
          Request a new login link
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-4 text-2xl font-bold">Verifying...</h1>
      <p className="text-brand-subtitle">Please wait while we log you in.</p>
    </div>
  );
}
