import { categories, technologyOptions } from "./catalog-options.ts";
import { validateExternalProjectUrl } from "./external.ts";
import { validateManifest } from "./storage-validation.ts";
import type { ManifestFile } from "./storage-validation.ts";

export type SubmissionPayload = {
  creatorType: "student" | "teacher";
  creatorDisplayName: string;
  contactEmail: string;
  gradeId: string;
  creatorRole: string | null;
  title: string;
  description: string;
  categories: (typeof categories)[number][];
  technologies: string[];
  sourceType: "html" | "zip" | "url";
  externalUrl: string | null;
  coverAlt: string;
  testInstructions: string;
  revisionReference: string | null;
  originalFilename: string | null;
  manifest: ManifestFile[];
  totalBytes: number;
  rightsConfirmed: true;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(readString).filter(Boolean))];
}

function validEmail(value: string) {
  return value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateSubmissionPayload(input: unknown): { data?: SubmissionPayload; error?: string } {
  const value = input as Record<string, unknown> | null;
  if (!value) return { error: "Submission details are missing." };
  const creatorType = readString(value.creatorType);
  const creatorDisplayName = readString(value.creatorDisplayName);
  const contactEmail = readString(value.contactEmail).toLowerCase();
  const gradeId = creatorType === "student" ? readString(value.gradeId) : "";
  const creatorRole = creatorType === "teacher" ? readString(value.creatorRole) : "";
  const title = readString(value.title);
  const description = readString(value.description);
  const selectedCategories = readList(value.categories);
  const technologies = readList(value.technologies);
  const sourceType = readString(value.sourceType);
  const externalUrl = readString(value.externalUrl) || null;
  const coverAlt = readString(value.coverAlt);
  const testInstructions = readString(value.testInstructions);
  const revisionReference = readString(value.revisionReference).toUpperCase() || null;
  const originalFilename = readString(value.originalFilename) || null;
  const rightsConfirmed = value.rightsConfirmed === true;

  if (!(creatorType === "student" || creatorType === "teacher")) return { error: "Choose Student or Teacher." };
  if (!creatorDisplayName || creatorDisplayName.length > 60) return { error: "English display name is required and must be 60 characters or fewer." };
  if (!validEmail(contactEmail)) return { error: "Enter a valid contact email address." };
  if (creatorType === "student" && !gradeId) return { error: "Choose a grade for a student project." };
  if (creatorType === "teacher" && (!creatorRole || creatorRole.length > 60)) return { error: "Enter a subject or department for a teacher project." };
  if (!title || title.length > 42) return { error: "Project title is required and must be 42 characters or fewer." };
  if (!description || description.length > 180) return { error: "Description is required and must be 180 characters or fewer." };
  if (!selectedCategories.length || selectedCategories.some((category) => !categories.includes(category as SubmissionPayload["categories"][number]))) return { error: "Choose at least one approved project category." };
  if (!technologies.length || technologies.some((technology) => !technologyOptions.includes(technology as (typeof technologyOptions)[number]))) return { error: "Choose at least one approved technology." };
  if (!coverAlt || coverAlt.length > 180) return { error: "Describe the project cover in 180 characters or fewer." };
  if (testInstructions.length > 500) return { error: "Testing notes must be 500 characters or fewer." };
  if (revisionReference && !/^AWH-\d{8}-[A-Z2-9]{6}$/.test(revisionReference)) return { error: "The previous submission number is not valid." };
  if (!rightsConfirmed) return { error: "Confirm the submission declaration before continuing." };
  if (!(sourceType === "html" || sourceType === "zip" || sourceType === "url")) return { error: "Choose HTML, ZIP, or HTTPS URL as the project source." };

  if (sourceType === "url") {
    const safeUrl = validateExternalProjectUrl(externalUrl ?? "");
    if (!safeUrl) return { error: "External projects require a public HTTPS address." };
    return {
      data: {
        creatorType, creatorDisplayName, contactEmail, gradeId, creatorRole: creatorRole || null,
        title, description, categories: selectedCategories as SubmissionPayload["categories"], technologies,
        sourceType, externalUrl: safeUrl, coverAlt, testInstructions, revisionReference,
        originalFilename: null, manifest: [], totalBytes: 0, rightsConfirmed: true,
      },
    };
  }

  if (!originalFilename || !originalFilename.toLowerCase().endsWith(sourceType === "html" ? ".html" : ".zip")) return { error: `Choose a ${sourceType.toUpperCase()} project file.` };
  const manifestValidation = validateManifest(value.manifest);
  if (!("files" in manifestValidation) || !manifestValidation.files) return { error: manifestValidation.error };
  return {
    data: {
      creatorType, creatorDisplayName, contactEmail, gradeId, creatorRole: creatorRole || null,
      title, description, categories: selectedCategories as SubmissionPayload["categories"], technologies,
      sourceType, externalUrl: null, coverAlt, testInstructions, revisionReference,
      originalFilename: originalFilename.slice(0, 180), manifest: manifestValidation.files,
      totalBytes: manifestValidation.totalBytes, rightsConfirmed: true,
    },
  };
}
