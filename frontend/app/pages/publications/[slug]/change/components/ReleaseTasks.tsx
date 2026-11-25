import { ValidationIssue } from "@/api/errors";
import { SLUG_REPLACED_CODE } from "@/apiv1/publications";
import { buttonVariants } from "@/components/stacks-ui/Button";
import { cn } from "@/lib/utils";
import isEqual from "lodash.isequal";
import { AlertTriangle, Check } from "lucide-react";
import { type Ref, useId, useMemo } from "react";

type ReleaseTask = { path: string[]; label: string; id: string };
type ReleaseTaskWithStatus = ReleaseTask & { ok: boolean };

const RELEASE_TASKS: ReleaseTask[] = [
  {
    path: ["title"],
    label: "Add a title",
    id: "title",
  },
  {
    path: ["body"],
    label: "Add a body",
    id: "body",
  },
  {
    path: ["slug"],
    label: "Choose a unique URL slug",
    id: "slug",
  },
  {
    path: ["contributors"],
    label: "Add at least one contributor to the byline",
    id: "contributors",
  },
] as const;

const VERSION_DESCRIPTION_TASK: ReleaseTask = {
  path: ["versionDesc"],
  label: "Version description required for new versions of a published pub",
  id: "versionDesc",
};

export function ReleaseTasks({
  fieldErrors,
  isPreviouslyPublished,
  ref,
}: {
  fieldErrors: ValidationIssue[] | null;
  isPreviouslyPublished: boolean;
  /** Focus target when a release attempt fails validation. */
  ref?: Ref<HTMLDivElement>;
}) {
  const headingId = useId();
  const releaseTasks: ReleaseTaskWithStatus[] = useMemo(() => {
    const blockingErrors = (fieldErrors ?? []).filter(
      (e) => e.code !== SLUG_REPLACED_CODE
    );
    let remainingErrors = [...blockingErrors];
    const done: ReleaseTaskWithStatus[] = [];
    const needWork: ReleaseTaskWithStatus[] = [];

    [
      ...RELEASE_TASKS,
      ...(isPreviouslyPublished ? [VERSION_DESCRIPTION_TASK] : []),
    ].forEach(({ path, ...props }) => {
      const ok =
        blockingErrors.find((e) => isEqual(e.path, path)) === undefined;
      remainingErrors = remainingErrors.filter((e) => !isEqual(e.path, path));
      if (ok) {
        done.push({ path, ok, ...props });
      } else {
        needWork.push({ path, ok, ...props });
      }
    });

    return [
      ...needWork,
      ...done,
      ...remainingErrors.map((e): ReleaseTaskWithStatus => ({
        ok: false,
        label: e.message,
        path: [],
        id: e.path.join("_"),
      })),
    ];
  }, [fieldErrors, isPreviouslyPublished]);

  const incompleteTasksCount = releaseTasks.filter((t) => !t.ok).length;

  if (incompleteTasksCount === 0) return null;

  return (
    <div
      ref={ref}
      aria-labelledby={headingId}
      className="border-border focus-visible:ring-focus scroll-mt-28 rounded-xl border outline-none focus-visible:ring-2 md:scroll-mt-36"
      role="region"
      tabIndex={-1}
    >
      <div className="flex items-center gap-4 p-4 md:px-5">
        <span className="bg-gray-blue-700 text-fg-inverted flex size-11 shrink-0 items-center justify-center rounded-md">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <div>
          <h2
            className="text-body-30 text-fg-strong font-medium"
            id={headingId}
          >
            {incompleteTasksCount} thing{incompleteTasksCount > 1 ? "s" : null}{" "}
            to fix before releasing
          </h2>
          <p className="text-body-20 text-fg-muted mt-0.5">
            Release becomes available once these are done.
          </p>
        </div>
      </div>
      <ul className="divide-border border-border divide-y border-t">
        {releaseTasks.map(({ label, ok, id }) => (
          <li
            key={`${id}-${label}`}
            className="flex items-center justify-between gap-4 px-4 py-3 md:px-5"
          >
            <span
              className={cn(
                "text-body-20 flex items-center gap-3",
                ok ? "text-fg-muted" : "text-fg-strong"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  ok
                    ? "text-fg-muted bg-gray-200"
                    : "bg-error-700 text-error-900"
                )}
              >
                {ok ? (
                  <Check aria-hidden className="size-3" />
                ) : (
                  <AlertTriangle aria-hidden className="size-3" />
                )}
              </span>
              {label}
              <span className="sr-only">{ok ? " (done)" : " (to fix)"}</span>
            </span>
            {!ok && (
              <a
                className={cn(
                  buttonVariants({ intent: "outline", size: "sm" }),
                  "shrink-0"
                )}
                href={`#newpub_${id}`}
              >
                Fix
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
