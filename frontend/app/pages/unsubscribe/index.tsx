import { unsubscribe, type UnsubscribeResponse } from "@/api/notifications";
import useAppNavigate from "@/hooks/useAppNavigate";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export default function UnsubscribePage() {
  const navigate = useAppNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [result, setResult] = useState<UnsubscribeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/account/settings#notifications", { replace: true });
      return;
    }

    async function handleUnsubscribe() {
      try {
        const data = await unsubscribe(token!);

        if (data.token_matches_auth_user) {
          navigate("/account/settings#notifications", {
            replace: true,
            state: { unsubscribedType: data.notification_type }
          });
          return;
        }

        setResult(data);
      } catch (err: any) {
        setError(err?.message || "Something went wrong. Please try again.");
      }
    }

    handleUnsubscribe();
  }, [token, navigate]);

  const classNames = "mt-4 flex flex-1 justify-center";

  if (error) {
    return (
      <div className={classNames}>
        <p className="text-error-800">{error}</p>
      </div>
    );
  }

  if (result) {
    if (result.error) {
      return (
        <div className={classNames}>
          <p className="text-error-800">{result.error}</p>
        </div>
      );
    }

    if (result.email && result.notification_name) {
      return (
        <div className={classNames}>
          <p>{result.email} has been unsubscribed.</p>
        </div>
      );
    }

    return (
      <div className={classNames}>
        <p className="text-error-800">
          Something went wrong. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className={`${classNames} gap-2`}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>Processing…</span>
    </div>
  );
}
