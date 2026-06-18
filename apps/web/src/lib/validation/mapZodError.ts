import { ZodError } from 'zod';

export function mapZodErrorToFields(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const zodErrors = error.flatten().fieldErrors;
  
  for (const [key, val] of Object.entries(zodErrors)) {
    if (val && val.length > 0) {
      fieldErrors[key] = val[0]; // pick first validation message
    }
  }
  
  return fieldErrors;
}
