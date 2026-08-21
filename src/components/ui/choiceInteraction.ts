import type { MouseEvent } from "react";

const INTERACTIVE_DESCENDANT = [
  "a",
  "area[href]",
  "audio[controls]",
  "button",
  "embed",
  "iframe",
  "input",
  "label",
  "object",
  "select",
  "summary",
  "textarea",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[role]:not([role='none']):not([role='presentation'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function activateChoiceFromRow(event: MouseEvent<HTMLDivElement>) {
  const target = event.target;
  if (target instanceof Element && target.closest(INTERACTIVE_DESCENDANT)) return;
  event.currentTarget.querySelector<HTMLInputElement>("input")?.click();
}
