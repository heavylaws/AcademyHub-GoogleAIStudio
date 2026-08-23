export class PromptValidationError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'PromptValidationError';
    this.statusCode = 400;
  }
}

/**
 * Validates maximum length, escapes XML delimiter tags, and wraps untrusted input inside XML tags.
 */
export function sanitizeAndDelimitInput(
  value: string | undefined | null,
  fieldName: string,
  tagName: string,
  maxLength: number
): { rawSanitized: string; delimited: string } {
  const strValue = value || '';

  if (strValue.length > maxLength) {
    throw new PromptValidationError(
      `Field '${fieldName}' exceeds maximum allowed length of ${maxLength} characters.`
    );
  }

  // Escape XML tag delimiters inside the content
  const escaped = strValue
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const delimited = `<${tagName}>${escaped}</${tagName}>`;

  return {
    rawSanitized: escaped,
    delimited,
  };
}
