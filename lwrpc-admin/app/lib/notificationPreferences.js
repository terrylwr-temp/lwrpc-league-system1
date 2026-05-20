export const NOTIFICATION_EMAIL = "email";
export const NOTIFICATION_TEXT = "text";

export function notificationPreferenceLabel(value) {
  return value === NOTIFICATION_TEXT ? "Text" : "Email";
}

export function splitNotificationRecipients(contacts) {
  const emails = new Set();
  const phones = new Set();

  (contacts || []).forEach((contact) => {
    const preference = contact?.notification_preference || NOTIFICATION_EMAIL;

    if (preference === NOTIFICATION_TEXT) {
      if (contact.phone) phones.add(contact.phone);
      return;
    }

    if (contact?.email) emails.add(contact.email);
  });

  return {
    emails: [...emails],
    phones: [...phones],
  };
}
