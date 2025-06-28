export function isValidShortcode(code) {
  return /^[a-zA-Z0-9]{4,10}$/.test(code);
}

export function generateShortcode(existingCodes) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 6;

  function gen() {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  let code;
  do {
    code = gen();
  } while (existingCodes.has(code));

  return code;
}
