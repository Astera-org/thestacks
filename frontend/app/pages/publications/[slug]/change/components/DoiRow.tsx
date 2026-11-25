import {
  DoiEligibility,
  getDoi,
  getDraftDoiEligibility,
  mintDoi,
  MintDoiResponse,
  saveSelfManagedDoi,
} from "@/apiv1/doi";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Button from "@/components/stacks-ui/Button";
import CopyButton from "@/components/stacks-ui/CopyButton";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import {
  draftMutationScope,
  setDraftPublicationField,
} from "@/hooks/useEditPublication";
import useDoiSaveStore from "@/store/doiSaveStore";
import { PublicationV1 } from "@/types/v1";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { ReactNode, useState } from "react";
import ChangeDoiModal from "./ChangeDoiModal";
import DoiInput, {
  doiSaveErrorMessage,
  doiSuffix,
  MANAGED_DOI_PREFIX,
  TEST_MANAGED_DOI_PREFIX,
} from "./DoiInput";
import FieldError from "./FieldError";
import FieldSuccess from "./FieldSuccess";
import Row, { LockedBadge } from "./Row";

export default function DoiRow({
  disabled,
  isPreviouslyPublished,
  publication,
  publicationId,
  status,
}: {
  disabled?: boolean;
  isPreviouslyPublished?: boolean;
  publication: PublicationV1;
  publicationId: string;
  status: EditPublicationStatus;
}) {
  const [inputDoi, setInputDoi] = useState("");
  const [selfDoiError, setSelfDoiError] = useState<string | null>(null);
  const [changeDoiOpen, setChangeDoiOpen] = useState(false);
  const queryClient = useQueryClient();

  const doi = publication.doi;
  const isManagedDoi =
    doi?.startsWith(MANAGED_DOI_PREFIX) ||
    doi?.startsWith(TEST_MANAGED_DOI_PREFIX);

  const {
    data: doiEligibility,
    isLoading,
    isError: isEligibilityError,
    error: eligibilityError,
    refetch: refetchEligibility,
  } = useQuery<DoiEligibility>({
    queryKey: [
      "doi_minting_enabled",
      publication.id,
      publication.orgs?.map((o) => o.orgId).join(",") ?? "",
    ],
    queryFn: () => getDraftDoiEligibility(publicationId),
    enabled:
      !!publication?.id &&
      !["saving", "init"].includes(status.status) &&
      !isManagedDoi &&
      !isPreviouslyPublished &&
      // With a DOI set, eligibility only decides whether Change DOI shows,
      // which a read-only viewer never sees.
      !(disabled && doi),
  });

  const showDoiInfoMutation = useMutation({
    mutationFn: () => getDoi(publicationId),
  });

  const mintDoiMutation = useMutation<MintDoiResponse | undefined, Error, void>(
    {
      // Queue behind any autosave, like the self-managed save: an older PATCH
      // response would otherwise reset the cached DOI written below to null.
      scope: draftMutationScope(publicationId),
      mutationFn: async () => {
        const doiInfo = await mintDoi(publicationId);
        return doiInfo;
      },
      onSuccess: (info) => {
        if (info) {
          setDraftPublicationField(queryClient, publicationId, "doi", info.doi);
          // A minted DOI supersedes an earlier failed self-managed save, whose
          // controls are now hidden; leave it and release stays blocked.
          useDoiSaveStore.getState().clearFailed(publicationId);
          showDoiInfoMutation.mutate();
        }
      },
      retry: false,
    }
  );

  const saveSelfDoiMutation = useMutation<void, Error, string>({
    // Queue behind any autosave: its response replaces the cached
    // publication and would otherwise revert the DOI written below.
    scope: draftMutationScope(publicationId),
    mutationFn: (doi) => saveSelfManagedDoi(publicationId, doi),
    // Runs before the save waits on the scope, so release is blocked while
    // it is queued too. A failure blocks it until a later save or a mint.
    onMutate: () => useDoiSaveStore.getState().start(publicationId),
    onSuccess: (_data, doi) => {
      useDoiSaveStore.getState().settle(publicationId);
      // Write into the editor's cache so `publication.doi` shows the new
      // value; a separate local copy would lose to the stale server value.
      setDraftPublicationField(queryClient, publicationId, "doi", doi);
      setInputDoi("");
      setSelfDoiError(null);
    },
    onError: (err) => {
      setSelfDoiError(doiSaveErrorMessage(err));
      useDoiSaveStore.getState().fail(publicationId);
    },
    retry: false,
  });

  const handleSaveSelfDoi = () => {
    if (!inputDoi) {
      setSelfDoiError("Please enter a DOI");
      return;
    }
    saveSelfDoiMutation.mutate(`10.${inputDoi}`);
  };

  const canEditSelfDoi =
    !isManagedDoi &&
    !!doiEligibility?.selfMinting &&
    !isPreviouslyPublished &&
    !disabled;

  const doiInfoJson = showDoiInfoMutation.data
    ? JSON.stringify(showDoiInfoMutation.data, null, 2)
    : "";

  const eligibilityRetry = (
    <>
      <FieldError
        announce
        message={eligibilityError?.message ?? "Error setting up DOI minting"}
      />
      <Button intent="outline" onClick={() => refetchEligibility()}>
        Retry
      </Button>
    </>
  );

  let content: ReactNode;
  // With a DOI already set, eligibility only decides whether Change DOI
  // shows, so keep the DOI on screen while it loads or if it fails.
  if (isLoading && !doi) {
    content = <LoadingSpinner />;
  } else if (isEligibilityError && !doi) {
    content = (
      <div className="flex h-full w-fit flex-col items-center justify-center gap-2">
        {eligibilityRetry}
      </div>
    );
  } else if (doi) {
    content = (
      <>
        <div className="border-carbon-100 flex min-h-13 items-center gap-2.5 rounded-lg border bg-gray-100 px-4">
          <Link2 aria-hidden className="text-carbon-400 size-4 shrink-0" />
          <span className="text-body-30 text-carbon-700 min-w-0 flex-1 py-3 font-mono break-all">
            <span className="text-body-20 text-gray-blue-400 mr-2">10.</span>
            {doiSuffix(doi)}
          </span>
          {isPreviouslyPublished && <LockedBadge className="bg-gray-200" />}
        </div>
        {(showDoiInfoMutation.data || showDoiInfoMutation.isPending) &&
          (mintDoiMutation.isPending || showDoiInfoMutation.isPending ? (
            <div className="flex h-40 w-full items-center justify-center rounded-lg bg-gray-200">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="relative">
              <pre className="text-caption-20 text-carbon-700 max-h-96 overflow-auto rounded-lg bg-gray-200 p-4 pr-12 font-mono whitespace-pre-wrap">
                {doiInfoJson}
              </pre>
              <CopyButton
                className="absolute top-3 right-3"
                text={doiInfoJson}
                tooltipContent="Copy DOI metadata"
              />
            </div>
          ))}
        <div className="flex flex-col gap-1">
          {showDoiInfoMutation.isError && (
            <FieldError
              announce
              message={
                showDoiInfoMutation.error?.message ??
                "Error fetching DataCite info"
              }
            />
          )}
          {mintDoiMutation.isError && (
            <FieldError
              announce
              message={mintDoiMutation.error?.message ?? "Error minting DOI"}
            />
          )}
          {mintDoiMutation.isSuccess && (
            <FieldSuccess message="DataCite draft updated" />
          )}
        </div>
        {isManagedDoi ? (
          <div className="mb-2 flex flex-row gap-3">
            <Button
              className="flex flex-row gap-2"
              disabled={
                showDoiInfoMutation.isPending || mintDoiMutation.isPending
              }
              intent="outline"
              onClick={() => showDoiInfoMutation.mutate()}
            >
              {!showDoiInfoMutation.data ? "Show DOI info" : "Refresh DOI info"}
            </Button>
            <Button
              className="flex flex-row gap-2"
              disabled={mintDoiMutation.isPending}
              intent="outline"
              onClick={() => mintDoiMutation.mutate()}
            >
              Update DataCite draft
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="text-caption-20 text-carbon-400 mt-1">
              This DOI is self-managed and cannot be updated by The Stacks.
            </div>
            {saveSelfDoiMutation.isSuccess && (
              <FieldSuccess message="DOI saved" />
            )}
            {isEligibilityError && !isPreviouslyPublished && !disabled && (
              <div className="mt-2 flex w-fit flex-col gap-2">
                {eligibilityRetry}
              </div>
            )}
            {canEditSelfDoi && (
              <>
                <Button
                  className="my-2 w-fit"
                  disabled={saveSelfDoiMutation.isPending}
                  intent="outline"
                  size="sm"
                  onClick={() => {
                    saveSelfDoiMutation.reset();
                    setChangeDoiOpen(true);
                  }}
                >
                  Change DOI
                </Button>
                <ChangeDoiModal
                  currentDoi={doi}
                  open={changeDoiOpen}
                  onClose={() => setChangeDoiOpen(false)}
                  onSave={(next) => saveSelfDoiMutation.mutateAsync(next)}
                />
              </>
            )}
          </div>
        )}
      </>
    );
  } else if (isPreviouslyPublished) {
    content = <span className="text-body-20 text-carbon-400">No DOI set</span>;
  } else if (doiEligibility?.selfMinting || doiEligibility?.minting) {
    const contentArr = [];
    if (doiEligibility.selfMinting) {
      contentArr.push(
        <div key="selfMinting" className="flex flex-col gap-2">
          <DoiInput
            aria-label="DOI"
            disabled={
              disabled ||
              saveSelfDoiMutation.isPending ||
              mintDoiMutation.isPending
            }
            error={selfDoiError ?? undefined}
            value={inputDoi}
            onChangeValue={(v) => {
              setInputDoi(v);
              setSelfDoiError(null);
            }}
          />
          <Button
            className="gap-2"
            disabled={
              disabled ||
              saveSelfDoiMutation.isPending ||
              mintDoiMutation.isPending
            }
            intent="outline"
            size="sm"
            onClick={handleSaveSelfDoi}
          >
            Save self-managed DOI
            {saveSelfDoiMutation.isPending && <LoadingSpinner />}
          </Button>
        </div>
      );
      if (doiEligibility?.minting) {
        contentArr.push(
          <div
            key="or"
            className="text-caption-20 text-carbon-400 py-2 font-mono uppercase"
          >
            or
          </div>
        );
      }
    }
    if (doiEligibility.minting) {
      contentArr.push(
        <Button
          key="mintNew"
          className="gap-2"
          // Only one DOI write at a time: a mint racing a self-managed save
          // could finish first and leave that save to fail after cleanup.
          disabled={
            disabled ||
            mintDoiMutation.isPending ||
            saveSelfDoiMutation.isPending
          }
          intent={doiEligibility?.selfMinting ? "outline" : "primary"}
          size="sm"
          onClick={() => mintDoiMutation.mutate()}
        >
          {doiEligibility?.selfMinting
            ? "Mint a DOI managed by The Stacks"
            : "Mint draft DOI"}
          {mintDoiMutation.isPending && <LoadingSpinner isDark />}
        </Button>
      );
    }
    content = contentArr;
  } else if (doiEligibility?.minting == false) {
    content = (
      <FieldError message="Your organization can't mint DOIs yet. Ask your org admin to enable DOI minting, or enter a DOI you registered elsewhere." />
    );
  } else {
    content = <LoadingSpinner />;
  }

  return (
    <Row
      hint={
        isPreviouslyPublished ? (
          "Locked after first release"
        ) : doi ? (
          isManagedDoi ? (
            <div className="flex flex-col gap-3">
              <span>
                This DOI is managed by The Stacks, you can update or view the
                DataCite metadata here before publishing.
              </span>
              <span>
                When you publish, The Stacks will automatically update the
                DataCite metadata and register the DOI as published.
              </span>
            </div>
          ) : (
            <>
              This DOI is self-managed. You will have to update the metadata
              manually
            </>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {doiEligibility?.minting && (
              <span>
                Press the button to mint a DOI, or one will be minted for you
                when you publish.
              </span>
            )}
            {doiEligibility?.selfMinting && (
              <span>
                {doiEligibility?.minting && <b>Or:</b>} Enter the DOI you've
                registered for this pub (e.g. via Crossref or DataCite).
              </span>
            )}
          </div>
        )
      }
      label="DOI"
      locked={isPreviouslyPublished}
      required={doiEligibility?.selfMinting && !isPreviouslyPublished}
    >
      <div className="flex w-full max-w-full flex-col gap-2">{content}</div>
    </Row>
  );
}
