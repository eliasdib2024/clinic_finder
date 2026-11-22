import { validationFailed } from '../errors/http-error.js';

// validate({ body, params, query }) – each value is a zod schema. Parsed values replace the originals
// (numbers become numbers, strings are trimmed, unknown fields are rejected). All problems are reported at once.
export function validate(schemas) {
  return (req, res, next) => {
    const errors = [];
    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        if (part === 'query') req.validatedQuery = result.data;   // req.query is read-only in Express 5
        else req[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({ in: part, field: issue.path.join('.') || '(root)', message: issue.message });
        }
      }
    }
    if (errors.length) return next(validationFailed(errors));
    next();
  };
}
