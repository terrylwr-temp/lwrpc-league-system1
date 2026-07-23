export function confirmDeleteAction({ title, details }) {
  const text = prompt(
    [title, "", details, "", "This action cannot be undone.", "", 'Type "DELETE" to confirm.'].join("\n")
  );

  return text === "DELETE";
}

export async function confirmDeleteActionAsync({ title, details }) {
  const { appPrompt } = await import("./appDialog");
  const text = await appPrompt({
    title,
    message: [details, "", "This action cannot be undone.", "", 'Type "DELETE" to confirm.'].join("\n"),
    inputLabel: "Type DELETE to confirm",
    requiredValue: "DELETE",
    confirmLabel: "Delete",
    tone: "error",
  });

  return text === "DELETE";
}
