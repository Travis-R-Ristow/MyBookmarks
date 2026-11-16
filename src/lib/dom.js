const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ICON_PATHS = {
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  bookmark: "M6 4h12v17l-6-4-6 4z",
  space: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  chevron: "M9 6l6 6-6 6",
  sort: "M4 6h13M4 12h9M4 18h5M17 10v10M14 17l3 3 3-3",
  cleanup: "M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9zM19 16v4M17 18h4",
  shortcuts: "M13 2L4 14h7l-1 8 9-12h-7z",
  move: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13h6M12.5 10.5L15 13l-2.5 2.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 7.5v6M12 16.8v.2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  close: "M6 6l12 12M18 6L6 18",
  pin: "M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17l-5.5 3 1-6.1L3 9.5l6.3-.9z",
};

export function el(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) {
      return;
    }
    if (key === "class") {
      element.className = value;
      return;
    }
    if (key === "text") {
      element.textContent = value;
      return;
    }
    if (key.startsWith("on")) {
      element.addEventListener(key.slice(2), value);
      return;
    }
    element.setAttribute(key, value === true ? "" : value);
  });
  [children].flat().forEach((child) => {
    if (child === undefined || child === null || child === false) {
      return;
    }
    element.append(child);
  });
  return element;
}

export function icon(name, size = 16) {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icon");
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

export function faviconUrl(pageUrl) {
  return `${chrome.runtime.getURL("/_favicon/")}?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
}

export function iconButton(name, label, onclick, extraClass = "") {
  return el("button", { class: `icon-button ${extraClass}`.trim(), type: "button", title: label, "aria-label": label, onclick }, icon(name));
}

export function textButton(label, onclick, options = {}) {
  const variant = options.variant ?? "ghost";
  return el("button", { class: `button button-${variant}`, type: "button", onclick }, [
    options.icon ? icon(options.icon) : null,
    el("span", { text: label }),
  ]);
}

export function spaceChip(style, extraClass = "") {
  const chip = el("span", { class: `space-chip ${extraClass}`.trim(), "aria-hidden": "true", text: style.icon });
  chip.style.setProperty("--chip", style.color);
  return chip;
}
