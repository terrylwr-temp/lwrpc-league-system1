"use client";

import { useEffect, useMemo, useRef } from "react";

const activeWarnings = new Map();

function warningMessage(itemName) {
  const name = itemName || "changes";
  return [
    `You have unsaved changes to this ${name}.`,
    "",
    `Select OK to leave without saving, or Cancel to stay and save the ${name}.`,
  ].join("\n");
}

function currentWarning() {
  return Array.from(activeWarnings.values()).at(-1) || null;
}

export function confirmUnsavedChanges() {
  if (typeof window === "undefined") return true;

  const warning = currentWarning();
  if (!warning) return true;

  return window.confirm(warning.message);
}

export function useUnsavedChangesWarning(hasUnsavedChanges, itemName) {
  const warningId = useRef(Symbol("unsaved-changes"));
  const message = useMemo(() => warningMessage(itemName), [itemName]);

  useEffect(() => {
    const id = warningId.current;

    if (hasUnsavedChanges) {
      activeWarnings.set(id, { message });
    } else {
      activeWarnings.delete(id);
    }

    return () => {
      activeWarnings.delete(id);
    };
  }, [hasUnsavedChanges, message]);

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!currentWarning()) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
