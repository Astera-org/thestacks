import { RequestError } from "@/api/errors";
import { StatusCodes } from "http-status-codes";
import LoadFailedState from "./LoadFailedState";
import NoAccessState from "./NoAccessState";
import NotFoundState from "./NotFoundState";

const SERVER_ERROR_MESSAGE =
  "The server ran into a problem loading this draft. Please try again in a moment.";

/** Picks the page to show when the draft couldn't be loaded. */
export default function LoadErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const apiError = error instanceof RequestError ? error.apiError : null;
  const status = apiError?.kind === "http" ? apiError.status : null;

  if (status === StatusCodes.FORBIDDEN) return <NoAccessState />;
  if (status === StatusCodes.NOT_FOUND) return <NotFoundState />;

  const isServerError =
    status !== null && status >= StatusCodes.INTERNAL_SERVER_ERROR;
  return (
    <LoadFailedState
      description={isServerError ? SERVER_ERROR_MESSAGE : undefined}
      error={error}
      onRetry={onRetry}
    />
  );
}
