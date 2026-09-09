export async function readApiResponse<T extends object>(
  response: Response,
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.redirected
    ) {
      throw new Error(
        'Your site access has expired. Reload FurEver to sign in again.',
      );
    }
    throw new Error(
      'The game service returned an unexpected page. Reload FurEver and try again.',
    );
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      'The game service returned an incomplete response. Please try again.',
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      'The game service returned an invalid response. Please try again.',
    );
  }
  if (!response.ok) {
    const message = (value as { error?: unknown }).error;
    throw new Error(
      typeof message === 'string' && message
        ? message
        : 'That action could not be completed. Please try again.',
    );
  }
  return value as T;
}
