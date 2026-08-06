export async function readApiResponse<T extends object>(response: Response): Promise<T & { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json() as T & { error?: string };
    } catch {
      return { error: "The server returned an incomplete response. Please try again." } as T & { error?: string };
    }
  }

  const text = (await response.text()).trim();
  const tooLarge = response.status === 413 || /payload too large|request entity too large/i.test(text);
  return {
    error: tooLarge
      ? "That photo was too large for the server. Choose it again and TapLex will automatically optimize it before uploading."
      : text.slice(0, 180) || "The server could not complete that request. Please try again.",
  } as T & { error?: string };
}
