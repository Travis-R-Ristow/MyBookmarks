import { el, icon } from "../lib/dom.js";
import { isIconImage } from "../lib/spaces.js";
import { ICON_IMAGE_TYPES, decodeSvgDataUrl, fileToIconDataUrl, isIconSvg, parseSvgInput } from "./icon-image.js";

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

const UNUSED_COLOR = "#888888";

function isPreset(field) {
  return field.options.some((option) => option.value === field.value);
}

function textCustom(field, markUsed) {
  const input = el("input", {
    class: "choice-custom",
    type: "text",
    maxlength: "16",
    value: isPreset(field) ? "" : field.value,
    placeholder: field.custom.placeholder,
    "aria-label": field.custom.label,
    autocomplete: "off",
  });
  input.addEventListener("input", () => {
    if (input.value.trim()) {
      markUsed();
    }
  });
  const clear = () => {
    input.value = "";
  };
  return { nodes: [input], read: () => input.value.trim(), clear };
}

function iconCustom(field, markUsed, setError) {
  let image = isIconImage(field.value) ? field.value : "";
  const isSvg = isIconSvg(field.value);
  const preview = el("img", { class: "choice-preview", alt: "Uploaded icon" });
  const showImage = (value) => {
    image = value;
    preview.hidden = !value;
    if (value) {
      preview.src = value;
    }
  };
  const svgArea = el("textarea", {
    class: "svg-input",
    placeholder: "Paste or edit SVG markup",
    rows: "3",
    spellcheck: "false",
    autocomplete: "off",
    hidden: !isSvg,
  });
  if (isSvg) {
    svgArea.value = decodeSvgDataUrl(field.value);
  }
  const clearSvg = () => {
    svgArea.value = "";
    svgArea.hidden = true;
  };
  const text = textCustom({ ...field, value: image ? "" : field.value }, () => {
    showImage("");
    clearSvg();
    markUsed();
  });
  const svgToggle = el("button", {
    class: "button",
    type: "button",
    text: "SVG",
    onclick: () => {
      svgArea.hidden = !svgArea.hidden;
      if (!svgArea.hidden) {
        svgArea.focus();
      }
    },
  });
  svgArea.addEventListener("input", () => {
    const value = svgArea.value.trim();
    if (!value) {
      showImage("");
      return;
    }
    try {
      const dataUrl = parseSvgInput(value);
      if (dataUrl) {
        showImage(dataUrl);
        text.clear();
        markUsed();
        setError("");
      }
    } catch (error) {
      setError(error.message);
    }
  });
  const fileInput = el("input", { type: "file", accept: ICON_IMAGE_TYPES, hidden: true });
  const upload = el("button", { class: "button button-ghost", type: "button", text: field.custom.uploadLabel, onclick: () => fileInput.click() });
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    fileInput.value = "";
    if (!file) {
      return;
    }
    try {
      showImage(await fileToIconDataUrl(file));
      text.clear();
      clearSvg();
      markUsed();
      setError("");
    } catch (error) {
      setError(error.message);
    }
  });
  showImage(image);
  const clear = () => {
    showImage("");
    text.clear();
    clearSvg();
  };
  return { nodes: [...text.nodes, upload, svgToggle, preview, fileInput, svgArea], read: () => image || text.read(), clear };
}

function colorCustom(field, markUsed) {
  let used = !isPreset(field);
  const input = el("input", { class: "choice-input", type: "color", value: used ? field.value : UNUSED_COLOR, "aria-label": field.custom.label });
  const face = el("span", { class: "choice-face choice-swatch choice-rainbow", title: field.custom.label });
  const paint = () => {
    face.classList.toggle("used", used);
    face.style.setProperty("--chip", input.value);
  };
  input.addEventListener("input", () => {
    used = true;
    paint();
    markUsed();
  });
  paint();
  const clear = () => {
    used = false;
    paint();
  };
  return { nodes: [el("label", { class: "choice" }, [input, face])], read: () => (used ? input.value : ""), clear };
}

const CUSTOM_BUILDERS = { icon: iconCustom, color: colorCustom };

function choiceField(field, setError) {
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
  const uncheckAll = () => {
    inputs.forEach((input) => {
      input.checked = false;
    });
  };
  const custom = field.custom ? CUSTOM_BUILDERS[field.custom.kind](field, uncheckAll, setError) : null;
  const choices = field.options.map((option, index) => {
    const face = el("span", { class: `choice-face choice-${field.variant}`, title: option.label, text: option.text });
    if (option.color) {
      face.style.setProperty("--chip", option.color);
    }
    return el("label", { class: "choice" }, [inputs[index], face]);
  });
  inputs.forEach((input) => {
    input.addEventListener("change", () => custom?.clear());
  });
  const node = el("fieldset", { class: "field" }, [
    el("legend", { class: "field-label", text: field.label }),
    el("div", { class: "choices" }, [...choices, ...(custom?.nodes ?? [])]),
  ]);
  const read = () => custom?.read() || inputs.find((input) => input.checked)?.value || field.value;
  return { name: field.name, node, read, focus: () => inputs.find((input) => input.checked)?.focus() };
}

function buildField(field, setError) {
  return field.type === "choice" ? choiceField(field, setError) : textField(field);
}

export function openFormDialog({ title, fields, submitLabel = "Save", validate = () => null }) {
  return new Promise((resolve) => {
    let result = null;
    const error = el("p", { class: "form-error", role: "alert" });
    const setError = (message) => {
      error.textContent = message;
    };
    const controls = fields.map((field) => buildField(field, setError));
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
