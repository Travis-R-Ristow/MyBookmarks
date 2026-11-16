export const ZONE_BEFORE = "before";
export const ZONE_AFTER = "after";
export const ZONE_INTO = "into";

const ZONES = [ZONE_BEFORE, ZONE_AFTER, ZONE_INTO];
const EDGE_RATIO = 0.28;
const HALF = 0.5;

let draggedId = null;

function zoneAt(event, element, allowInto) {
  const bounds = element.getBoundingClientRect();
  const ratio = (event.clientY - bounds.top) / bounds.height;
  if (!allowInto) {
    return ratio < HALF ? ZONE_BEFORE : ZONE_AFTER;
  }
  if (ratio < EDGE_RATIO) {
    return ZONE_BEFORE;
  }
  if (ratio > 1 - EDGE_RATIO) {
    return ZONE_AFTER;
  }
  return ZONE_INTO;
}

function clearZones(element) {
  ZONES.forEach((zone) => element.classList.remove(`drop-${zone}`));
}

export function makeDraggable(element, id) {
  element.setAttribute("draggable", "true");
  element.addEventListener("dragstart", (event) => {
    draggedId = id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    element.classList.add("dragging");
  });
  element.addEventListener("dragend", () => {
    draggedId = null;
    element.classList.remove("dragging");
  });
}

export function makeRowDropTarget(element, { allowInto, canAccept, onDrop }) {
  element.addEventListener("dragover", (event) => {
    clearZones(element);
    const zone = zoneAt(event, element, allowInto);
    if (!draggedId || !canAccept(draggedId, zone)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    element.classList.add(`drop-${zone}`);
  });
  element.addEventListener("dragleave", () => {
    clearZones(element);
  });
  element.addEventListener("drop", (event) => {
    clearZones(element);
    const id = draggedId;
    const zone = zoneAt(event, element, allowInto);
    draggedId = null;
    if (!id || !canAccept(id, zone)) {
      return;
    }
    event.preventDefault();
    onDrop(id, zone);
  });
}

export function makeDropTarget(element, { canAccept, onDrop }) {
  makeRowDropTarget(element, {
    allowInto: true,
    canAccept: (id) => canAccept(id),
    onDrop: (id) => onDrop(id),
  });
  element.classList.add("drop-whole");
}
