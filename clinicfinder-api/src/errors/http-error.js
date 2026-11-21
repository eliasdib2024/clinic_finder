// http-error.js – an Error that carries an HTTP status (and optional field errors)
export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    if (errors) this.errors = errors;
  }
}

// errors: [{ field, message }] – shown next to the matching form field in the frontend
export const badRequest = (message, errors) => new HttpError(400, message, errors);
export const unauthorized = (message = 'Please sign in to continue.') => new HttpError(401, message);
export const forbidden = (message = 'You do not have access to this resource.') => new HttpError(403, message);
export const notFound = (what) => new HttpError(404, `${what} not found`);
export const conflict = (message, errors) => new HttpError(409, message, errors);
export const validationFailed = (errors) => new HttpError(422, 'Please fix the highlighted fields.', errors);
