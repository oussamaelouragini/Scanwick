export type SeoStatus = "pass" | "warn" | "fail";

export type SeoCheck = {
  id: string;
  label: string;
  status: SeoStatus;
  detail: string;
};

export type SeoReport = {
  checks: SeoCheck[];
  passed: number;
  total: number;
};

// Raw values read from the page by the browser
export type RawSeo = {
  title: string;
  description: string;
  viewport: string;
  lang: string;
  h1Count: number;
  h1Text: string;
  imageCount: number;
  imagesMissingAlt: number;
};

function short(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function buildSeoChecks(raw: RawSeo): SeoReport {
  const checks: SeoCheck[] = [];

  // 1. Title
  const titleLength = raw.title.length;
  if (titleLength === 0) {
    checks.push({
      id: "title",
      label: "Page title",
      status: "fail",
      detail: "No <title> tag found. Every page needs a unique title.",
    });
  } else if (titleLength < 30 || titleLength > 60) {
    checks.push({
      id: "title",
      label: "Page title",
      status: "warn",
      detail: `${titleLength} characters. Aim for 30 to 60 so it is not cut in search results.`,
    });
  } else {
    checks.push({
      id: "title",
      label: "Page title",
      status: "pass",
      detail: `${titleLength} characters. Good length.`,
    });
  }

  // 2. Meta description
  const descriptionLength = raw.description.length;
  if (descriptionLength === 0) {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "fail",
      detail:
        "No meta description found. Search engines show it under your title.",
    });
  } else if (descriptionLength < 70 || descriptionLength > 160) {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "warn",
      detail: `${descriptionLength} characters. Aim for 70 to 160.`,
    });
  } else {
    checks.push({
      id: "description",
      label: "Meta description",
      status: "pass",
      detail: `${descriptionLength} characters. Good length.`,
    });
  }

  // 3. H1 heading
  if (raw.h1Count === 0) {
    checks.push({
      id: "h1",
      label: "Main heading (H1)",
      status: "fail",
      detail:
        "No H1 heading found. Add one main heading that describes the page.",
    });
  } else if (raw.h1Count === 1) {
    checks.push({
      id: "h1",
      label: "Main heading (H1)",
      status: "pass",
      detail: `One H1: "${short(raw.h1Text)}"`,
    });
  } else {
    checks.push({
      id: "h1",
      label: "Main heading (H1)",
      status: "warn",
      detail: `${raw.h1Count} H1 headings found. Use exactly one per page.`,
    });
  }

  // 4. Image alt text
  if (raw.imageCount === 0) {
    checks.push({
      id: "alt",
      label: "Image alt text",
      status: "pass",
      detail: "No images found on the page.",
    });
  } else if (raw.imagesMissingAlt === 0) {
    checks.push({
      id: "alt",
      label: "Image alt text",
      status: "pass",
      detail: `All ${raw.imageCount} images have an alt attribute.`,
    });
  } else {
    checks.push({
      id: "alt",
      label: "Image alt text",
      status: raw.imagesMissingAlt >= 10 ? "fail" : "warn",
      detail: `${raw.imagesMissingAlt} of ${raw.imageCount} images have no alt attribute.`,
    });
  }

  // 5. Mobile viewport tag
  if (!raw.viewport) {
    checks.push({
      id: "viewport",
      label: "Mobile viewport tag",
      status: "fail",
      detail:
        "Missing viewport meta tag. The page will not scale correctly on phones.",
    });
  } else if (raw.viewport.includes("width=device-width")) {
    checks.push({
      id: "viewport",
      label: "Mobile viewport tag",
      status: "pass",
      detail: "Set to width=device-width.",
    });
  } else {
    checks.push({
      id: "viewport",
      label: "Mobile viewport tag",
      status: "warn",
      detail: `Set to "${short(raw.viewport)}". It should usually be width=device-width, initial-scale=1.`,
    });
  }

  // 6. Page language
  if (!raw.lang) {
    checks.push({
      id: "lang",
      label: "Page language",
      status: "warn",
      detail:
        "No lang attribute on <html>. Screen readers and search engines use it.",
    });
  } else {
    checks.push({
      id: "lang",
      label: "Page language",
      status: "pass",
      detail: `Language: ${raw.lang}`,
    });
  }

  return {
    checks,
    passed: checks.filter((c) => c.status === "pass").length,
    total: checks.length,
  };
}
