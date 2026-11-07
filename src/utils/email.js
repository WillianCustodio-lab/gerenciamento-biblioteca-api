export function isValidEmail(email) {
  const atIndex = email.indexOf("@");
  const domainDotIndex = email.indexOf(".", atIndex + 2);

  return (
    atIndex > 0 &&
    atIndex === email.lastIndexOf("@") &&
    domainDotIndex > atIndex + 1 &&
    domainDotIndex < email.length - 1 &&
    !/\s/.test(email)
  );
}
