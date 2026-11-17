import { el, spaceChip, textButton } from "../../lib/dom.js";
import { countBookmarks, isFolder } from "../../lib/tree.js";
import { plural } from "../actions.js";

function spaceCard(space, style, isPinnedSpace, navigateToFolder) {
  const bookmarks = countBookmarks(space, isPinnedSpace);
  const folders = (space.children ?? []).filter((child) => isFolder(child) && !isPinnedSpace(child)).length;
  const card = el("button", {
    class: "home-card",
    type: "button",
    onclick: () => navigateToFolder(space.id),
  }, [
    spaceChip(style, "space-chip-large"),
    el("div", { class: "home-card-body" }, [
      el("span", { class: "home-card-name", text: space.title }),
      el("span", { class: "home-card-meta", text: `${plural(bookmarks, "bookmark")} · ${plural(folders, "folder")}` }),
    ]),
  ]);
  card.style.setProperty("--chip", style.color);
  return card;
}

export function renderHome({ container, spaces, spaceStyle, isPinnedSpace, navigateToFolder, addSpace }) {
  const cards = spaces.map((space) => spaceCard(space, spaceStyle(space.id), isPinnedSpace, navigateToFolder));
  container.replaceChildren(
    el("div", { class: "view-head" }, [
      el("h1", { class: "crumb crumb-current", text: "Spaces" }),
      el("div", { class: "view-actions" }, textButton("New space", addSpace, { icon: "plus", variant: "primary" })),
    ]),
    cards.length
      ? el("div", { class: "home-grid" }, cards)
      : el("div", { class: "empty" }, [
          el("p", { class: "empty-emoji", "aria-hidden": "true", text: "📚" }),
          el("p", { class: "empty-title", text: "No spaces yet" }),
          el("p", { class: "empty-detail", text: "Create a space to organize your bookmarks." }),
        ]),
  );
}
