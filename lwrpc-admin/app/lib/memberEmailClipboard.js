export async function copyMemberEmail(event, email, clipboard = globalThis.navigator?.clipboard, documentRef = globalThis.document) {
  event.stopPropagation();
  if (!email) return false;

  try {
    await clipboard.writeText(email);
    return true;
  } catch {
    if (!documentRef?.body) return false;
    const field = documentRef.createElement("textarea");
    field.value = email;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    documentRef.body.appendChild(field);
    try {
      field.select();
      return documentRef.execCommand("copy") === true;
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }
}
