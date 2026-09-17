export function rangeBelongsToEditor(editor, range) {
  const container = range?.commonAncestorContainer;
  return Boolean(
    editor &&
    container &&
    (container === editor || editor.contains(container))
  );
}

export function captureEditorSelection(editor, selection) {
  if (!editor || !selection || selection.rangeCount < 1) return null;

  const range = selection.getRangeAt(0);
  return rangeBelongsToEditor(editor, range) ? range.cloneRange() : null;
}

export function restoreEditorSelection(editor, selection, documentRef, preferredRange) {
  if (!editor || !selection || !documentRef) return null;

  let range = rangeBelongsToEditor(editor, preferredRange) ? preferredRange : null;
  if (!range) {
    range = documentRef.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  editor.focus();
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
}
