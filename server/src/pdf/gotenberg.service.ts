const GOTENBERG_URL = process.env.GOTENBERG_URL ?? "http://localhost:3001";

/** A4 dimensions in inches, which is the unit Gotenberg's form fields expect. */
const A4_WIDTH_IN = 8.27;
const A4_HEIGHT_IN = 11.7;

/** Page margin in inches, matching the `@page` margin in the templates (16mm). */
const MARGIN_IN = 0.63;

interface PdfPageOptions {
  /** Uniform print margin in inches. Existing templates default to 16mm. */
  marginIn?: number;
}

/**
 * Converts an HTML document into a PDF using Gotenberg's Chromium route.
 *
 * Gotenberg requires the main document to be named exactly `index.html` in the
 * multipart body. Page size and margins are set explicitly as form fields
 * because Gotenberg defaults to US Letter and does not honour `@page { size }`
 * from the stylesheet.
 *
 * @param html - A complete, standalone HTML document (styles inlined).
 * @returns The generated PDF as a Buffer.
 * @throws If Gotenberg is unreachable or returns a non-2xx response.
 */
export async function convertHtmlToPdf(
  html: string,
  options: PdfPageOptions = {},
): Promise<Buffer> {
  const marginIn = options.marginIn ?? MARGIN_IN;
  const form = new FormData();
  form.append("files", new Blob([html], { type: "text/html" }), "index.html");
  form.append("printBackground", "true");
  form.append("paperWidth", String(A4_WIDTH_IN));
  form.append("paperHeight", String(A4_HEIGHT_IN));
  form.append("marginTop", String(marginIn));
  form.append("marginBottom", String(marginIn));
  form.append("marginLeft", String(marginIn));
  form.append("marginRight", String(marginIn));

  const endpoint = `${GOTENBERG_URL}/forms/chromium/convert/html`;

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: form });
  } catch (cause) {
    throw new Error(
      `Could not reach Gotenberg at ${GOTENBERG_URL}. Is the container running?`,
      { cause },
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gotenberg returned ${response.status} ${response.statusText}. ${detail}`.trim(),
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
