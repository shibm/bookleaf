export const money = (n) =>
  n == null
    ? 'Not set'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);
export const date = (d) =>
  d
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(d))
    : 'Not yet';
export const short = (id) => `BL-${id.slice(-6).toUpperCase()}`;
export const tone = (s) =>
  s === 'Critical'
    ? 'red'
    : s === 'High'
      ? 'orange'
      : s === 'Resolved' || s === 'Published & Live'
        ? 'green'
        : s === 'Closed'
          ? 'gray'
          : 'blue';
