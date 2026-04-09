import { useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
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
  }, [token, verifyMagicLink]);

  useEffect(() => {
    if (verifyMagicLink.isSuccess) {
      navigate("/settings", { replace: true });
    }
  }, [verifyMagicLink.isSuccess, navigate]);

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
        <Link to="/login" className="text-sm text-brand-text underline">
          Request a new login link
        </Link>
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
