// phone.js – normalise a Lebanese phone number to +961XXXXXXX(X); returns null if invalid.
// Same rules as the frontend validator, so both sides accept exactly the same numbers.
export function normalizeLebanesePhone(input) {
  if (!input) return null;
  let d = String(input).replace(/[\s\-().]/g, '');
  if (d.startsWith('+961')) d = d.slice(4);
  else if (d.startsWith('00961')) d = d.slice(5);
  else if (d.startsWith('961') && d.length >= 10) d = d.slice(3);
  if (!/^\d+$/.test(d)) return null;
  if (/^(70|71|76|78|79|81)\d{6}$/.test(d)) return `+961${d}`;   // mobile
  if (/^0?3\d{6}$/.test(d)) return `+9613${d.slice(-6)}`;           // mobile 03
  if (/^0?[1456789]\d{6}$/.test(d)) return `+961${d.replace(/^0/, '')}`; // landline
  return null;
}
