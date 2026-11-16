import { el } from "../lib/dom.js";
import { ORIGIN_ACCOUNT, ORIGIN_LABELS, origins } from "../lib/merge.js";

export function originTags(view) {
  if (!view.tagged) {
    return [];
  }
  return origins(view).map((origin) =>
    el("span", { class: `tag ${origin === ORIGIN_ACCOUNT ? "tag-account" : "tag-device"}`, text: ORIGIN_LABELS[origin] }),
  );
}
