const IS_PROD = process.env.NODE_ENV === 'production';

function timestamp() {
  return new Date().toISOString();
}

export function info(msg, data = null) {
  const entry = `[${timestamp()}] INFO: ${msg}`;
  console.log(data ? `${entry} ${JSON.stringify(data)}` : entry);
}

export function warn(msg, data = null) {
  const entry = `[${timestamp()}] WARN: ${msg}`;
  console.warn(data ? `${entry} ${JSON.stringify(data)}` : entry);
}

export function error(msg, err = null) {
  const entry = `[${timestamp()}] ERROR: ${msg}`;
  if (err) {
    console.error(entry, IS_PROD ? err.message : err);
  } else {
    console.error(entry);
  }
}
