"use client";

import { useEffect, useMemo, useRef } from "react";
import { appConfirm } from "./appDialog";

const activeWarnings = new Map();

function warningMessage(itemName) {
  const name = itemName || "changes";
  return `You have unsaved changes to this ${name}. Leave this screen without saving?`;
}

function currentWarning() {
  return Array.from(activeWarnings.values()).at(-1) || null;
}

export async function confirmUnsavedChanges() {
  if (typeof window === "undefined") return true;

  const warning = currentWarning();
  if (!warning) return true;

  return Boolean(await appConfirm({
    title: "Unsaved changes",
    message: warning.message,
    confirmLabel: "Leave without saving",
    cancelLabel: "Keep editing",
    defaultAction: "cancel",
    tone: "warning",
  }));
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
