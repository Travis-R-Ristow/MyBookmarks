import { el, icon, iconButton } from "../lib/dom.js";

const SUCCESS_DURATION_MS = 4000;
const ACTION_DURATION_MS = 8000;
const KIND_SUCCESS = "success";
const KIND_ERROR = "error";
const KIND_ICONS = { [KIND_SUCCESS]: "check", [KIND_ERROR]: "alert" };
const host = document.getElementById("toasts");

function present({ kind, message, action, duration }) {
  const toast = el("div", { class: `toast toast-${kind}`, role: kind === KIND_ERROR ? "alert" : "status" });
  const dismiss = () => toast.remove();
  const runAction = () => {
    dismiss();
    action.run();
  };
  toast.append(
    el("span", { class: "toast-icon" }, icon(KIND_ICONS[kind], 18)),
    el("span", { class: "toast-message", text: message }),
  );
  if (action) {
    toast.append(el("button", { class: "toast-action", type: "button", text: action.label, onclick: runAction }));
  }
  toast.append(iconButton("close", "Dismiss", dismiss));
  host.append(toast);
  if (duration) {
    setTimeout(dismiss, duration);
  }
}

export function showSuccess(message, action = null) {
  present({ kind: KIND_SUCCESS, message, action, duration: action ? ACTION_DURATION_MS : SUCCESS_DURATION_MS });
}

export function showError(message) {
  present({ kind: KIND_ERROR, message, action: null, duration: null });
}
