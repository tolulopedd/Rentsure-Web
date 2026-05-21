const nigeriaPhonePattern = /^(?:0\d{10}|\+234\d{10})$/;

export function isValidNigeriaPhone(value: string) {
  return nigeriaPhonePattern.test(value.trim());
}

export function nigeriaPhoneMessage() {
  return "Phone number must be either 11 digits starting with 0, for example 09052222022, or +234 followed by 10 digits, for example +2349052222022.";
}
