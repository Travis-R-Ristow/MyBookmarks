import { el, icon } from "../lib/dom.js";

const DISARM_AFTER_MS = 3500;
const ACCIDENTAL_DOUBLE_CLICK_MS = 350;

function buttonClass(showLabel, neutral) {
  if (neutral) {
    return "confirm-button confirm-button-neutral";
  }
  return showLabel ? "confirm-button confirm-button-labeled" : "confirm-button";
}

export function confirmButton({ label, confirmLabel = "Confirm delete", iconName = "trash", showLabel = false, neutral = false, onConfirm }) {
  let armedAt = 0;
  let disarmTimer = null;
  const text = el("span", { class: "confirm-text", text: label });
  const button = el(
    "button",
    { class: buttonClass(showLabel, neutral), type: "button", title: label, "aria-label": label },
    [icon(iconName), text],
  );
  const setLabel = (value) => {
    text.textContent = value;
    button.setAttribute("aria-label", value);
  };
  const disarm = () => {
    clearTimeout(disarmTimer);
    armedAt = 0;
    button.classList.remove("armed");
    setLabel(label);
  };
  const arm = () => {
    armedAt = Date.now();
    button.classList.add("armed");
    setLabel(confirmLabel);
    disarmTimer = setTimeout(disarm, DISARM_AFTER_MS);
  };
  button.addEventListener("click", () => {
    if (!armedAt) {
      arm();
      return;
    }
    if (Date.now() - armedAt < ACCIDENTAL_DOUBLE_CLICK_MS) {
      return;
    }
    disarm();
    onConfirm();
  });
  button.addEventListener("blur", disarm);
  return button;
}
