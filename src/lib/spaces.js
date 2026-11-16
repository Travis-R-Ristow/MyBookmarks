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

export function normalizeIcon(text) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const [first] = segmenter.segment(text.trim());
  if (!first || !EMOJI_PATTERN.test(first.segment)) {
    return null;
  }
  return first.segment;
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
    },
    {
      name: "icon",
      label: "Icon",
      type: "choice",
      variant: "emoji",
      value: style.icon,
      options: SPACE_ICONS.map((emoji) => ({ value: emoji, label: emoji, text: emoji })),
      custom: { label: "Custom emoji", placeholder: "Or type your own" },
    },
  ];
}
