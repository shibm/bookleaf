export const failure = (status, message) =>
  Object.assign(new Error(message), { status });
