import type { KeyboardEvent } from "react";

/** Escape closes a modal dialog even when a control inside handles the key. */
export function closeOnEscape(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.currentTarget.close();
  }
}
