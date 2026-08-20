export interface FlattenableZodError {
  flatten: () => {
    fieldErrors: Record<string, unknown>;
  };
}

export function mapZodErrorToFields(error: FlattenableZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const zodErrors = error.flatten().fieldErrors;

  for (const [key, val] of Object.entries(zodErrors)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
      fieldErrors[key] = val[0]; // pick first validation message
    }
  }

  return fieldErrors;
}
