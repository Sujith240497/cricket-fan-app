export function success(res, data = {}, message = '', metaOrStatus = 200) {
  // Support: success(res, data, message, meta) or success(res, data, message, status)
  let status = 200;
  let meta = undefined;
  if (typeof metaOrStatus === 'object' && metaOrStatus !== null) {
    meta = metaOrStatus;
  } else if (typeof metaOrStatus === 'number') {
    status = metaOrStatus;
  }
  const response = { success: true, data, message };
  if (meta) response.meta = meta;
  return res.status(status).json(response);
}

export function created(res, data = {}, message = 'Created') {
  return success(res, data, message, 201);
}

export function fail(res, error = 'Something went wrong', status = 400) {
  return res.status(status).json({ success: false, error });
}

export function unauthorized(res, error = 'Unauthorized') {
  return fail(res, error, 401);
}

export function notFound(res, error = 'Not found') {
  return fail(res, error, 404);
}

export function conflict(res, error = 'Conflict') {
  return fail(res, error, 409);
}
