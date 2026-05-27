export async function runFormSubmit(
  submitter: () => Promise<void> | void,
  setError: (message: string) => void,
  fallbackMessage = "Failed to submit form.",
) {
  setError("");
  try {
    await submitter();
  } catch (error) {
    const message = error instanceof Error ? error.message : fallbackMessage;
    setError(message);
  }
}
