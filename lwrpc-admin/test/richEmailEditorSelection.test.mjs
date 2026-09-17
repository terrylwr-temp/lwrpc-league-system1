import assert from "node:assert/strict";
import test from "node:test";

import {
  captureEditorSelection,
  rangeBelongsToEditor,
  restoreEditorSelection,
} from "../app/lib/richEmailEditorSelection.js";

test("captures only a selection that belongs to the email editor", () => {
  const editorChild = {};
  const outsideNode = {};
  const clonedRange = { id: "saved-editor-range" };
  const editor = { contains: (node) => node === editorChild };
  const editorRange = {
    commonAncestorContainer: editorChild,
    cloneRange: () => clonedRange,
  };
  const outsideRange = {
    commonAncestorContainer: outsideNode,
    cloneRange: () => ({ id: "wrong-range" }),
  };

  assert.equal(rangeBelongsToEditor(editor, editorRange), true);
  assert.equal(rangeBelongsToEditor(editor, outsideRange), false);
  assert.equal(
    captureEditorSelection(editor, { rangeCount: 1, getRangeAt: () => editorRange }),
    clonedRange
  );
  assert.equal(
    captureEditorSelection(editor, { rangeCount: 1, getRangeAt: () => outsideRange }),
    null
  );
});

test("restores the saved editor range after the link prompt takes focus", () => {
  const editorChild = {};
  const savedRange = { commonAncestorContainer: editorChild };
  let focused = false;
  let removedRanges = false;
  let restoredRange = null;
  const editor = {
    contains: (node) => node === editorChild,
    focus: () => {
      focused = true;
    },
  };
  const selection = {
    removeAllRanges: () => {
      removedRanges = true;
    },
    addRange: (range) => {
      restoredRange = range;
    },
  };

  const result = restoreEditorSelection(editor, selection, {}, savedRange);

  assert.equal(result, savedRange);
  assert.equal(focused, true);
  assert.equal(removedRanges, true);
  assert.equal(restoredRange, savedRange);
});

test("falls back to the end of the email when there is no valid saved range", () => {
  const outsideNode = {};
  const invalidRange = { commonAncestorContainer: outsideNode };
  const fallbackRange = {
    selectedNode: null,
    collapsedToStart: null,
    selectNodeContents(node) {
      this.selectedNode = node;
    },
    collapse(toStart) {
      this.collapsedToStart = toStart;
    },
  };
  const editor = {
    contains: () => false,
    focus: () => {},
  };
  let restoredRange = null;
  const selection = {
    removeAllRanges: () => {},
    addRange: (range) => {
      restoredRange = range;
    },
  };
  const documentRef = { createRange: () => fallbackRange };

  const result = restoreEditorSelection(
    editor,
    selection,
    documentRef,
    invalidRange
  );

  assert.equal(result, fallbackRange);
  assert.equal(fallbackRange.selectedNode, editor);
  assert.equal(fallbackRange.collapsedToStart, false);
  assert.equal(restoredRange, fallbackRange);
});
