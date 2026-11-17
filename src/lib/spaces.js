export const SPACE_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#2f7df6", label: "Blue" },
  { value: "#0d9488", label: "Teal" },
  { value: "#16a34a", label: "Green" },
  { value: "#d97706", label: "Amber" },
  { value: "#ea580c", label: "Orange" },
  { value: "#e11d48", label: "Rose" },
  { value: "#9333ea", label: "Purple" },
];

export const SPACE_ICONS = [
  "⭐", "📦", "📱", "💼", "🏠", "📚", "🧪", "🛠️",
  "🎨", "🎮", "🎵", "✈️", "🛒", "💰", "📰", "🧠",
  "❤️", "🔥", "🚀", "🌱", "🍿", "📷", "🎓", "🧭",
];

const ROOT_ICONS = { "bookmarks-bar": "⭐", other: "📦", mobile: "📱" };
const ROTATING_ICONS = SPACE_ICONS.filter((emoji) => !Object.values(ROOT_ICONS).includes(emoji));
const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator}|⃣/u;

export const ICON_IMAGE_SIZE = 64;

const ICON_IMAGE_PATTERN = /^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;
const MAX_ICON_IMAGE_LENGTH = 40000;
const MAX_TEXT_ICON_GRAPHEMES = 2;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;
const LIGHT_COLOR_LUMINANCE = 0.45;
const TEXT_ON_LIGHT = "#111827";
const TEXT_ON_DARK = "#ffffff";

export function isIconImage(icon) {
  return icon.length <= MAX_ICON_IMAGE_LENGTH && ICON_IMAGE_PATTERN.test(icon);
}

export function isEmoji(text) {
  return EMOJI_PATTERN.test(text);
}

export function normalizeIcon(text) {
  const trimmed = text.trim();
  if (isIconImage(trimmed)) {
    return trimmed;
  }
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const graphemes = [...segmenter.segment(trimmed)].map((part) => part.segment);
  if (!graphemes.length) {
    return null;
  }
  if (isEmoji(graphemes[0])) {
    return graphemes[0];
  }
  return graphemes.slice(0, MAX_TEXT_ICON_GRAPHEMES).join("");
}

export function normalizeColor(text) {
  const candidate = text.trim().toLowerCase();
  return HEX_COLOR_PATTERN.test(candidate) ? candidate : null;
}

function channelLuminance(value) {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function readableTextColor(hexColor) {
  const [red, green, blue] = [1, 3, 5].map((offset) => parseInt(hexColor.slice(offset, offset + 2), 16));
  const luminance = 0.2126 * channelLuminance(red) + 0.7152 * channelLuminance(green) + 0.0722 * channelLuminance(blue);
  return luminance > LIGHT_COLOR_LUMINANCE ? TEXT_ON_LIGHT : TEXT_ON_DARK;
}

export function defaultSpaceStyle(node, index) {
  return {
    color: SPACE_COLORS[index % SPACE_COLORS.length].value,
    icon: ROOT_ICONS[node.folderType] ?? ROTATING_ICONS[index % ROTATING_ICONS.length],
  };
}

export function resolveSpaceStyle(savedStyle, node, index) {
  return { ...defaultSpaceStyle(node, index), ...savedStyle };
}

export function withoutSpaces(spaceFolderIds, spaceStyles, removedIds) {
  const removed = new Set(removedIds);
  const keptIds = spaceFolderIds.filter((id) => !removed.has(id));
  const keptStyles = Object.fromEntries(Object.entries(spaceStyles).filter(([id]) => !removed.has(id)));
  const changed = keptIds.length !== spaceFolderIds.length || Object.keys(keptStyles).length !== Object.keys(spaceStyles).length;
  return { spaceFolderIds: keptIds, spaceStyles: keptStyles, changed };
}

export function remapSpaces(before, current, idMap) {
  const spaceFolderIds = [...current.spaceFolderIds];
  const spaceStyles = { ...current.spaceStyles };
  let changed = false;
  idMap.forEach((newId, oldId) => {
    if (before.spaceFolderIds.includes(oldId)) {
      spaceFolderIds.push(newId);
      changed = true;
    }
    if (before.spaceStyles[oldId]) {
      spaceStyles[newId] = before.spaceStyles[oldId];
      changed = true;
    }
  });
  return { spaceFolderIds, spaceStyles, changed };
}

export function spaceStyleFields(style) {
  return [
    {
      name: "color",
      label: "Color",
      type: "choice",
      variant: "swatch",
      value: style.color,
      options: SPACE_COLORS.map((color) => ({ value: color.value, label: color.label, color: color.value })),
      custom: { kind: "color", label: "Pick any color" },
    },
    {
      name: "icon",
      label: "Icon",
      type: "choice",
      variant: "emoji",
      value: style.icon,
      options: SPACE_ICONS.map((emoji) => ({ value: emoji, label: emoji, text: emoji })),
      custom: { kind: "icon", label: "Custom emoji, text, or SVG", placeholder: "Emoji, text, or paste SVG", uploadLabel: "Upload image" },
    },
  ];
}
