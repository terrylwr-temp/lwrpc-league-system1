export function confirmDeleteAction({ title, details }) {
  const text = prompt(
    [
      title,
      "",
      details,
      "",
      "This action cannot be undone.",
      "",
      'Type "DELETE" to confirm.',
    ].join("\n")
  );

  return text === "DELETE";
}
