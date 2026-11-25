import { ContactUsFields, createLinearTask } from "@/api/contact-us";
import Button from "@/components/stacks-ui/Button";
import FileInput from "@/components/stacks-ui/FileInput";
import Input from "@/components/stacks-ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/stacks-ui/Tabs";
import Textarea from "@/components/stacks-ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type ContactUsType = ContactUsFields["type"];

interface FieldConfig {
  id: string;
  field: FormField;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  optionalHint?: boolean;
}

const COMMON_FIELDS: FieldConfig[] = [
  {
    id: "contact-us-title",
    field: "title",
    label: "Title",
    placeholder: "Concise, one sentence description of the problem",
    required: true
  },
  {
    id: "contact-us-team",
    field: "team",
    label: "Team",
    placeholder: "e.g. Prism",
    required: true
  },
  {
    id: "contact-us-stakeholders",
    field: "stakeholders",
    label: "Stakeholders",
    placeholder: "Who's affected, or who's asking for this?",
    required: true
  }
];

const BUG_FIELDS: FieldConfig[] = [
  {
    id: "contact-us-current-behavior",
    field: "whatDoesItCurrentlyDo",
    label: "What does it currently do?",
    placeholder: "Describe the current behavior",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-blocked-by",
    field: "whatCantYouDoBecauseOfThis",
    label: "What can't you do because of this?",
    placeholder: "What's blocked as a result?",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-risks",
    field: "whatAreTheRisks",
    label: "What are the risks?",
    placeholder: "What could go wrong if this isn't fixed/added?",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-steps",
    field: "stepsToReproduce",
    label: "Steps to reproduce",
    placeholder: "1. Go to...\n2. Click...\n3. See...",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-expected",
    field: "expectedBehavior",
    label: "Expected behavior",
    placeholder: "What should happen instead?",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-actual",
    field: "actualBehavior",
    label: "Actual behavior",
    placeholder: "What actually happens?",
    required: true,
    multiline: true
  }
];

const FEATURE_FIELDS: FieldConfig[] = [
  {
    id: "contact-us-trying-to-do",
    field: "whatAreYouTryingToDo",
    label: "What are you trying to accomplish?",
    placeholder: "Describe the outcome you're trying to reach",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-stopping-you",
    field: "whatsStoppingYou",
    label: "What's stopping you from doing this today?",
    placeholder: "What's in your way right now?",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-impact",
    field: "impactIfNotBuilt",
    label: "What's the impact if this isn't built?",
    placeholder: "What happens if this doesn't get built?",
    required: true,
    multiline: true
  },
  {
    id: "contact-us-solution",
    field: "proposedSolution",
    label: "Proposed solution",
    placeholder: "Any ideas on how this could work?",
    optionalHint: true,
    multiline: true
  }
];

const TRAILING_FIELDS: FieldConfig[] = [
  {
    id: "contact-us-tried-already",
    field: "triedAlready",
    label: "What have you tried already?",
    placeholder: "Workarounds, other tools, etc.",
    optionalHint: true,
    multiline: true
  }
];

const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

const MAX_SCREENSHOT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_SCREENSHOT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "video/mp4"
];

const SCREENSHOT_ACCEPT_ATTR = [
  ...ACCEPTED_SCREENSHOT_TYPES,
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".mp4"
].join(",");

function fieldsForType(type: ContactUsType): FieldConfig[] {
  return [
    ...COMMON_FIELDS,
    ...(type === "bug" ? BUG_FIELDS : FEATURE_FIELDS),
    ...TRAILING_FIELDS
  ];
}

// Every field is a plain string at the schema level - required-ness depends on
// `type`, so it's enforced in superRefine below using the same field configs
// that drive the rendered form, rather than duplicating the required list.
const contactUsSchema = z
  .object({
    type: z.enum(["bug", "featureRequest"]),
    title: z.string().trim(),
    team: z.string().trim(),
    stakeholders: z.string().trim(),
    dueDate: z.string().trim(),
    triedAlready: z.string().trim(),
    whatDoesItCurrentlyDo: z.string().trim(),
    whatCantYouDoBecauseOfThis: z.string().trim(),
    whatAreTheRisks: z.string().trim(),
    stepsToReproduce: z.string().trim(),
    expectedBehavior: z.string().trim(),
    actualBehavior: z.string().trim(),
    severity: z.string(),
    whatAreYouTryingToDo: z.string().trim(),
    whatsStoppingYou: z.string().trim(),
    impactIfNotBuilt: z.string().trim(),
    proposedSolution: z.string().trim(),
    screenshot: z
      .instanceof(File)
      .refine(
        (file) => ACCEPTED_SCREENSHOT_TYPES.includes(file.type),
        "Must be a PNG, JPG, GIF, or MP4 file"
      )
      .refine(
        (file) => file.size <= MAX_SCREENSHOT_SIZE_BYTES,
        "File must be under 10MB"
      )
      .nullable()
  })
  .superRefine((data, ctx) => {
    for (const config of fieldsForType(data.type)) {
      if (config.required && !data[config.field]) {
        ctx.addIssue({
          code: "custom",
          message: "This field is required",
          path: [config.field]
        });
      }
    }
  });

type FormValues = z.infer<typeof contactUsSchema>;
type FormField = Exclude<keyof FormValues, "type" | "screenshot">;

const EMPTY_FORM: FormValues = {
  type: "bug",
  title: "",
  team: "",
  stakeholders: "",
  dueDate: "",
  triedAlready: "",
  whatDoesItCurrentlyDo: "",
  whatCantYouDoBecauseOfThis: "",
  whatAreTheRisks: "",
  stepsToReproduce: "",
  expectedBehavior: "",
  actualBehavior: "",
  severity: "",
  whatAreYouTryingToDo: "",
  whatsStoppingYou: "",
  impactIfNotBuilt: "",
  proposedSolution: "",
  screenshot: null
};

function buildPayload(values: FormValues): ContactUsFields {
  const shared = {
    title: values.title,
    team: values.team,
    stakeholders: values.stakeholders,
    dueDate: values.dueDate || null,
    triedAlready: values.triedAlready || null
  };

  if (values.type === "bug") {
    return {
      ...shared,
      type: "bug",
      whatDoesItCurrentlyDo: values.whatDoesItCurrentlyDo,
      whatCantYouDoBecauseOfThis: values.whatCantYouDoBecauseOfThis,
      whatAreTheRisks: values.whatAreTheRisks,
      stepsToReproduce: values.stepsToReproduce,
      expectedBehavior: values.expectedBehavior,
      actualBehavior: values.actualBehavior,
      severity: values.severity || null
    };
  }

  return {
    ...shared,
    type: "featureRequest",
    whatAreYouTryingToDo: values.whatAreYouTryingToDo,
    whatsStoppingYou: values.whatsStoppingYou,
    impactIfNotBuilt: values.impactIfNotBuilt,
    proposedSolution: values.proposedSolution || null
  };
}

interface ContactUsFieldProps {
  config: FieldConfig;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** Label content shared by every field: the base text plus a required or optional marker. */
function fieldLabel(
  label: string,
  { required, optionalHint }: { required?: boolean; optionalHint?: boolean }
) {
  return (
    <>
      {label}
      {required && <span className="text-carbon-500 ml-1">*</span>}
      {optionalHint && (
        <span className="text-fg-muted ml-1 text-sm">(optional)</span>
      )}
    </>
  );
}

function ContactUsTextField(props: ContactUsFieldProps) {
  const { config, value, error, disabled, onChange } = props;
  const { id, label, placeholder, required, multiline, optionalHint } = config;

  return multiline ? (
    <Textarea
      id={id}
      label={fieldLabel(label, { required, optionalHint })}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      disabled={disabled}
    />
  ) : (
    <Input
      id={id}
      type="text"
      label={fieldLabel(label, { required, optionalHint })}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      disabled={disabled}
    />
  );
}

interface ContactUsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after the Linear task is created successfully.
  onCreated?: (result: {
    issueId: string;
    issueIdentifier: string;
    issueUrl: string;
  }) => void;
}

/**
 * A modal form for reporting a bug or requesting a feature. Submits via
 * `createLinearTask`, which files the form as a Linear issue.
 */
export function ContactUsModal(props: ContactUsModalProps) {
  const { open, onOpenChange, onCreated } = props;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(contactUsSchema),
    defaultValues: EMPTY_FORM
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const type = watch("type");

  // Reset state when modal opens.
  useEffect(() => {
    if (open) {
      reset(EMPTY_FORM);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createLinearTask(buildPayload(values), values.screenshot ?? undefined),
    onSuccess: (result) => {
      toast.success(`${result.issueIdentifier} created successfully.`);
      onCreated?.(result);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit form.");
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    mutation.mutate(values);
  };

  const isPending = isSubmitting || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact The Stacks Team</DialogTitle>
          <DialogDescription>
            Report a bug or request a feature. This will create a task for the
            team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid min-w-0 gap-4 py-4">
            {/* Type toggle. */}
            <Tabs
              value={type}
              onValueChange={(next) => setValue("type", next as ContactUsType)}
            >
              <TabsList aria-label="Contact type">
                <TabsTrigger
                  value="bug"
                  disabled={isPending}
                  className="flex-1 justify-center"
                >
                  Bug
                </TabsTrigger>
                <TabsTrigger
                  value="featureRequest"
                  disabled={isPending}
                  className="flex-1 justify-center"
                >
                  Feature Request
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {[
              ...COMMON_FIELDS,
              ...(type === "bug" ? BUG_FIELDS : FEATURE_FIELDS)
            ].map((config) => (
              <Controller
                key={config.id}
                name={config.field}
                control={control}
                render={({ field, fieldState }) => (
                  <ContactUsTextField
                    config={config}
                    value={field.value}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    onChange={field.onChange}
                  />
                )}
              />
            ))}

            {/* Severity - bug only, optional. */}
            {type === "bug" && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="contact-us-severity"
                  className="text-body-30 text-carbon-500 font-sans"
                >
                  {fieldLabel("Severity", { optionalHint: true })}
                </label>
                <Controller
                  name="severity"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="contact-us-severity"
                        className="border-carbon-200 hover:border-gray-blue-900 data-[state=open]:border-gray-blue-900 text-body-30 text-fg bg-surface h-13 rounded-lg border px-4 font-sans"
                      >
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent className="z-[300]">
                        {SEVERITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Due date - optional. */}
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Input
                  id="contact-us-due-date"
                  type="date"
                  label={fieldLabel("Due date", { optionalHint: true })}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />

            {TRAILING_FIELDS.map((config) => (
              <Controller
                key={config.id}
                name={config.field}
                control={control}
                render={({ field, fieldState }) => (
                  <ContactUsTextField
                    config={config}
                    value={field.value}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    onChange={field.onChange}
                  />
                )}
              />
            ))}

            <Controller
              name="screenshot"
              control={control}
              render={({
                field: { value, onChange, onBlur, name, ref },
                fieldState
              }) => (
                <FileInput
                  id="contact-us-screenshot"
                  name={name}
                  ref={ref}
                  accept={SCREENSHOT_ACCEPT_ATTR}
                  label={fieldLabel("Screenshot or video", {
                    optionalHint: true
                  })}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  disabled={isPending}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              intent="secondary"
              size="lg"
              pill={false}
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" pill={false} disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </div>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
