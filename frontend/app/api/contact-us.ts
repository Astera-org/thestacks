import { http } from "@/api/client";
import { z } from "zod";

const bugContactUsSchema = z.object({
  type: z.literal("bug"),
  whatDoesItCurrentlyDo: z.string(),
  whatCantYouDoBecauseOfThis: z.string(),
  whatAreTheRisks: z.string(),
  stepsToReproduce: z.string(),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  severity: z.string().nullable(),
  title: z.string(),
  stakeholders: z.string(),
  team: z.string(),
  dueDate: z.string().nullable(),
  triedAlready: z.string().nullable()
});

const featureRequestContactUsSchema = z.object({
  type: z.literal("featureRequest"),
  whatAreYouTryingToDo: z.string(),
  whatsStoppingYou: z.string(),
  impactIfNotBuilt: z.string(),
  proposedSolution: z.string().nullable(),
  title: z.string(),
  stakeholders: z.string(),
  team: z.string(),
  dueDate: z.string().nullable(),
  triedAlready: z.string().nullable()
});

export const contactUsFieldsSchema = z.discriminatedUnion("type", [
  bugContactUsSchema,
  featureRequestContactUsSchema
]);

export type ContactUsFields = z.infer<typeof contactUsFieldsSchema>;

// Hono's c.req.parseBody() reads multipart/form-data, not JSON, and only
// understands flat string/File fields - so null fields are omitted rather
// than sent as the string "null", matching emptyToNull's "missing key means
// absent" semantics on the backend.
function buildFormData(payload: ContactUsFields, screenshot?: File): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null) {
      formData.append(key, value);
    }
  }
  if (screenshot) {
    formData.append("screenshot", screenshot);
  }
  return formData;
}

export async function createLinearTask(
  payload: ContactUsFields,
  screenshot?: File
): Promise<{ issueId: string; issueIdentifier: string; issueUrl: string }> {
  const res = await http.post<{
    issueId: string;
    issueIdentifier: string;
    issueUrl: string;
  }>("/contact-us", buildFormData(payload, screenshot), {
    // Axios defaults to Content-Type: application/json on this instance,
    // which would make it JSON.stringify the FormData instead of sending it.
    // Clearing it here lets the browser set multipart/form-data with the
    // right boundary itself.
    headers: { "Content-Type": null }
  });
  return res.data;
}
