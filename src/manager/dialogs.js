import { el, icon } from "../lib/dom.js";

const dialog = document.getElementById("dialog");

let pressStartedOnBackdrop = false;

dialog.addEventListener("mousedown", (event) => {
  pressStartedOnBackdrop = event.target === dialog;
});

dialog.addEventListener("click", (event) => {
  if (pressStartedOnBackdrop && event.target === dialog) {
    dialog.close();
  }
});

function present(content) {
  dialog.replaceChildren(content);
  dialog.showModal();
}

function closeButton(label) {
  return el("button", { class: "button button-ghost", type: "button", text: label, onclick: () => dialog.close() });
}

function textField(field) {
  const input = el("input", {
    type: "text",
    name: field.name,
    value: field.value ?? "",
    placeholder: field.placeholder,
    autocomplete: "off",
    spellcheck: "false",
  });
  const node = el("label", { class: "field" }, [
    el("span", { class: "field-label", text: field.label }),
    input,
    field.hint ? el("span", { class: "field-hint", text: field.hint }) : null,
  ]);
  return { name: field.name, node, read: () => input.value.trim(), focus: () => input.select() };
}

function customChoiceInput(field) {
  if (!field.custom) {
    return null;
  }
  const preset = field.options.some((option) => option.value === field.value);
  return el("input", {
    class: "choice-custom",
    type: "text",
    maxlength: "16",
    value: preset ? "" : field.value,
    placeholder: field.custom.placeholder,
    "aria-label": field.custom.label,
    autocomplete: "off",
  });
}

function choiceField(field) {
  const inputs = field.options.map((option) =>
    el("input", {
      class: "choice-input",
      type: "radio",
      name: field.name,
      value: option.value,
      checked: option.value === field.value,
      "aria-label": option.label,
    }),
  );
  const custom = customChoiceInput(field);
  const choices = field.options.map((option, index) => {
    const face = el("span", { class: `choice-face choice-${field.variant}`, title: option.label, text: option.text });
    if (option.color) {
      face.style.setProperty("--chip", option.color);
    }
    return el("label", { class: "choice" }, [inputs[index], face]);
  });
  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (custom) {
        custom.value = "";
      }
    });
  });
  custom?.addEventListener("input", () => {
    if (!custom.value.trim()) {
      return;
    }
    inputs.forEach((input) => {
      input.checked = false;
    });
  });
  const node = el("fieldset", { class: "field" }, [
    el("legend", { class: "field-label", text: field.label }),
    el("div", { class: "choices" }, [...choices, custom]),
  ]);
  const read = () => custom?.value.trim() || inputs.find((input) => input.checked)?.value || field.value;
  return { name: field.name, node, read, focus: () => inputs.find((input) => input.checked)?.focus() };
}

function buildField(field) {
  return field.type === "choice" ? choiceField(field) : textField(field);
}

export function openFormDialog({ title, fields, submitLabel = "Save", validate = () => null }) {
  return new Promise((resolve) => {
    let result = null;
    const controls = fields.map(buildField);
    const error = el("p", { class: "form-error", role: "alert" });
    const submit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(controls.map((control) => [control.name, control.read()]));
      const message = validate(values);
      if (message) {
        error.textContent = message;
        return;
      }
      result = values;
      dialog.close();
    };
    const form = el("form", { class: "dialog-body", onsubmit: submit }, [
      el("h2", { text: title }),
      ...controls.map((control) => control.node),
      error,
      el("div", { class: "dialog-actions" }, [
        closeButton("Cancel"),
        el("button", { class: "button button-primary", type: "submit", text: submitLabel }),
      ]),
    ]);
    dialog.addEventListener("close", () => resolve(result), { once: true });
    present(form);
    controls[0]?.focus();
  });
}

export function openConfirmDialog({ title, message, confirmLabel = "Delete", variant = "danger" }) {
  return new Promise((resolve) => {
    let confirmed = false;
    const confirm = () => {
      confirmed = true;
      dialog.close();
    };
    const body = el("div", { class: "dialog-body" }, [
      el("h2", { text: title }),
      el("p", { class: "dialog-message", text: message }),
      el("div", { class: "dialog-actions" }, [
        closeButton("Cancel"),
        el("button", { class: `button button-${variant}`, type: "button", text: confirmLabel, onclick: confirm }),
      ]),
    ]);
    dialog.addEventListener("close", () => resolve(confirmed), { once: true });
    present(body);
  });
}

function folderOption(folder, filtering, choose) {
  const option = el("button", { class: "picker-option", type: "button", disabled: folder.current, onclick: () => choose(folder.id) }, [
    icon("folder"),
    el("span", { class: "picker-title", text: folder.title || "Untitled folder" }),
    filtering ? el("span", { class: "picker-path", text: folder.path }) : null,
    folder.current ? el("span", { class: "badge badge-muted", text: "Current" }) : null,
  ]);
  option.style.setProperty("--depth", filtering ? 0 : folder.depth);
  return option;
}

export function openFolderPicker({ title, folders }) {
  return new Promise((resolve) => {
    let chosen = null;
    const choose = (id) => {
      chosen = id;
      dialog.close();
    };
    const list = el("div", { class: "picker-list" });
    const filter = el("input", { type: "search", placeholder: "Filter folders", "aria-label": "Filter folders", autocomplete: "off", spellcheck: "false" });
    const renderList = () => {
      const query = filter.value.trim().toLowerCase();
      const visible = folders.filter((folder) => folder.title.toLowerCase().includes(query));
      const options = visible.map((folder) => folderOption(folder, Boolean(query), choose));
      list.replaceChildren(...options);
      if (!options.length) {
        list.append(el("p", { class: "picker-empty", text: "No folders match." }));
      }
    };
    filter.addEventListener("input", renderList);
    renderList();
    const body = el("div", { class: "dialog-body" }, [
      el("h2", { text: title }),
      el("label", { class: "field" }, filter),
      list,
      el("div", { class: "dialog-actions" }, closeButton("Cancel")),
    ]);
    dialog.addEventListener("close", () => resolve(chosen), { once: true });
    present(body);
    filter.focus();
  });
}
