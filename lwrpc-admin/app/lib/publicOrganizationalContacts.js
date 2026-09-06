// Owner-reviewed public contacts, not runtime support settings or a domain exemption.
export const PUBLIC_ORGANIZATIONAL_EMAILS = Object.freeze(['info@lwrpickleballclub.com']);

export function hasUnapprovedEmail(value) {
  // Match the complete token so prefixes, suffixes and plus-addresses cannot borrow the exception.
  const emails = String(value ?? '').match(/[\w.!#$%&'*+/=?^`{|}~+-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
  return emails.some(email => !PUBLIC_ORGANIZATIONAL_EMAILS.includes(email.toLowerCase()));
}
