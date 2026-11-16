import { el, textButton } from "../../lib/dom.js";
import { guarded } from "../actions.js";

const CHROME_SITE_SEARCH_URL = "chrome://settings/searchEngines";
const PLACEHOLDER = "%s";

const EXAMPLES = [
  { shortcut: "gh", url: "https://github.com/search?q=%s", typed: "gh react hooks", result: "https://github.com/search?q=react+hooks" },
  { shortcut: "jira", url: "https://your-company.atlassian.net/browse/%s", typed: "jira ABC-123", result: "https://your-company.atlassian.net/browse/ABC-123" },
  { shortcut: "yt", url: "https://www.youtube.com/results?search_query=%s", typed: "yt lofi", result: "https://www.youtube.com/results?search_query=lofi" },
];

function openChromeSiteSearch() {
  return guarded(() => chrome.tabs.create({ url: CHROME_SITE_SEARCH_URL }));
}

function steps(items) {
  return el("ol", { class: "how-to" }, items.map((item) => el("li", {}, el("span", {}, item))));
}

function section(title, detail, body) {
  return [
    el("div", { class: "section-row" }, el("div", {}, [el("h2", { text: title }), el("p", { class: "section-detail", text: detail })])),
    ...body,
  ];
}

function exampleCard(example) {
  return el("section", { class: "card" }, [
    el("header", { class: "card-head" }, [el("kbd", { text: example.shortcut }), el("span", { class: "card-url", text: example.url })]),
    el("p", { class: "example-line" }, ["Typing ", el("kbd", { text: example.typed }), " opens ", el("code", { text: example.result })]),
  ]);
}

export function renderShortcuts(context) {
  context.container.replaceChildren(
    el("div", { class: "view-head" }, [
      el("h1", { class: "crumb crumb-current", text: "Site search shortcuts" }),
      el("div", { class: "view-actions" }, textButton("Manage in Chrome settings", openChromeSiteSearch, { icon: "shortcuts", variant: "primary" })),
    ]),
    el("p", { class: "all-clear" }, [
      "Site search is a Chrome feature. Chrome does not let extensions read or change these shortcuts, so you manage them in Chrome's settings. This page explains how they work.",
    ]),
    ...section("How it works", "Search any website straight from the address bar.", [
      steps([
        ["A site search has a shortcut and a URL containing ", el("kbd", { text: PLACEHOLDER }), "."],
        [el("kbd", { text: PLACEHOLDER }), " is a placeholder. Chrome replaces it with whatever you type after the shortcut."],
        ["To use one, type the shortcut in the address bar, press ", el("kbd", { text: "Tab" }), ", then type your search."],
      ]),
    ]),
    ...section("Examples", "The shortcut, the URL you save, and what happens when you use it.", [
      el("div", { class: "card-list" }, EXAMPLES.map(exampleCard)),
    ]),
    ...section("Create one", "Takes about a minute per site.", [
      steps([
        ["Go to the site and search for the word ", el("kbd", { text: "test" }), "."],
        ["Copy the address of the results page."],
        ["Click Manage in Chrome settings above, find Site search, and choose Add."],
        ["Paste the address and replace ", el("kbd", { text: "test" }), " with ", el("kbd", { text: PLACEHOLDER }), ". Pick a short shortcut and save."],
      ]),
    ]),
    ...section("Search your bookmarks", "Also built into Chrome.", [
      steps([["In the address bar type ", el("kbd", { text: "@bookmarks" }), ", press ", el("kbd", { text: "Tab" }), ", then type part of a bookmark's name."]]),
    ]),
  );
}
