import { state } from "../state.js";

let activeDragState = null;
let isRegistered = false;

export function registerCalendarDragController() {
  if (isRegistered) return;
  isRegistered = true;

  document.addEventListener("pointerdown", handleCalendarPointerDown);
  document.addEventListener("pointermove", handleCalendarPointerMove);
  document.addEventListener("pointerup", handleCalendarPointerUp);
  document.addEventListener("pointercancel", resetActiveCalendarDrag);
}

function handleCalendarPointerDown(e) {
  const resizeHandle = e.target.closest(".event-resize-handle");
  const moveHandle = e.target.closest(".event-drag-handle");
  const card = e.target.closest(".event-card");
  const timelineRow = e.target.closest(".timeline-event-row");
  const timelineGrab = e.target.closest(".timeline-card-grab");
  const wrapper = card ? card.closest(".calendar-grid-wrapper") : resizeHandle?.closest(".calendar-grid-wrapper");
  const isMobileWeekOverview = wrapper?.dataset.calendarMode === "week" && isTouchCalendarViewport();

  if (timelineRow && !e.target.closest(".timeline-edit-btn, .timeline-delete-btn")) {
    const requiresHandle = isTouchCalendarViewport();
    if (requiresHandle && !timelineGrab) {
      activeDragState = {
        type: "timeline-tap",
        eventId: timelineRow.dataset.eventId,
        card: timelineRow,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false,
      };
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    captureCalendarPointer(timelineRow, e.pointerId);
    activeDragState = {
      type: "timeline-move",
      eventId: timelineRow.dataset.eventId,
      card: timelineRow,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      sourceDayIndex: parseInt(timelineRow.dataset.dayIndex, 10) || 0,
      targetDayGroup: timelineRow.closest(".timeline-day-group"),
      hasMoved: false,
    };
    return;
  }

  if (card && isMobileWeekOverview && !e.target.closest(".event-action-btn, .event-delete-btn")) {
    activeDragState = {
      type: "tap",
      eventId: card.dataset.eventId,
      card,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };
    return;
  }

  if (resizeHandle && !isMobileWeekOverview) {
    e.preventDefault();
    e.stopPropagation();
    const parentCard = resizeHandle.closest(".event-card");
    const col = parentCard.closest(".calendar-col");
    captureCalendarPointer(parentCard, e.pointerId);
    activeDragState = {
      type: "resize",
      eventId: resizeHandle.dataset.eventId,
      card: parentCard,
      col,
      pointerId: e.pointerId,
      startY: e.clientY,
      initialHeight: parentCard.offsetHeight,
      initialHeightStyle: parentCard.style.height,
    };
    return;
  }

  if (card && !e.target.closest(".event-action-btn, .event-delete-btn")) {
    const requiresHandle = isTouchCalendarViewport();
    if (requiresHandle && !moveHandle) {
      activeDragState = {
        type: "tap",
        eventId: card.dataset.eventId,
        card,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false,
      };
      return;
    }

    const col = card.closest(".calendar-col");
    captureCalendarPointer(card, e.pointerId);
    activeDragState = {
      type: "move",
      eventId: card.dataset.eventId,
      card,
      col,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      durationHours: Number(card.dataset.durationHours) || 2,
      hasMoved: false,
    };
  }
}

function handleCalendarPointerMove(e) {
  if (!activeDragState) return;

  if (activeDragState.type === "timeline-tap") {
    markTapMoved(e);
    return;
  }

  if (activeDragState.type === "timeline-move") {
    const dx = e.clientX - activeDragState.startX;
    const dy = e.clientY - activeDragState.startY;

    if (Math.hypot(dx, dy) > 8) {
      activeDragState.hasMoved = true;
      e.preventDefault();
      activeDragState.card.classList.add("is-dragging");
      activeDragState.card.style.transform = `translate(${dx}px, ${dy}px) scale(0.98)`;

      const targetElem = document.elementFromPoint(e.clientX, e.clientY);
      const targetDayGroup = targetElem ? targetElem.closest(".timeline-day-group") : null;

      document.querySelectorAll(".timeline-day-group").forEach((group) => group.classList.remove("drag-hover"));
      if (targetDayGroup) {
        targetDayGroup.classList.add("drag-hover");
        activeDragState.targetDayGroup = targetDayGroup;
      }
    }
    return;
  }

  if (activeDragState.type === "tap") {
    markTapMoved(e);
    return;
  }

  if (activeDragState.type === "resize") {
    handleResizeMove(e);
    return;
  }

  if (activeDragState.type === "move") {
    handleCardMove(e);
  }
}

function handleCalendarPointerUp(e) {
  if (!activeDragState) return;

  if (activeDragState.type === "timeline-tap") {
    if (!activeDragState.hasMoved) openCalendarEventDrawer(activeDragState.eventId);
    activeDragState = null;
    return;
  }

  if (activeDragState.type === "timeline-move") {
    releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
    activeDragState.card.classList.remove("is-dragging");
    activeDragState.card.style.transform = "";
    document.querySelectorAll(".timeline-day-group").forEach((group) => group.classList.remove("drag-hover"));

    if (activeDragState.hasMoved && activeDragState.targetDayGroup) {
      const targetDayIndex = parseInt(activeDragState.targetDayGroup.dataset.dayIndex, 10);
      if (Number.isFinite(targetDayIndex) && targetDayIndex !== activeDragState.sourceDayIndex) {
        state.updateCalendarEvent(state.activeTripId, activeDragState.eventId, {
          dayIndex: targetDayIndex,
        });
      }
    } else if (!activeDragState.hasMoved) {
      openCalendarEventDrawer(activeDragState.eventId);
    }

    activeDragState = null;
    return;
  }

  if (activeDragState.type === "tap") {
    if (!activeDragState.hasMoved) openCalendarEventDrawer(activeDragState.eventId);
    activeDragState = null;
    return;
  }

  if (activeDragState.type === "resize") {
    releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
    if (activeDragState.newEndTime) {
      state.updateCalendarEvent(state.activeTripId, activeDragState.eventId, {
        endTime: activeDragState.newEndTime,
      });
    }
    activeDragState = null;
    return;
  }

  if (activeDragState.type === "move") {
    releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
    activeDragState.card.classList.remove("is-dragging");
    activeDragState.card.style.transform = "";
    document.querySelectorAll(".calendar-col").forEach((col) => col.classList.remove("drag-hover"));

    if (activeDragState.hasMoved && (activeDragState.targetCol || activeDragState.col)) {
      const targetCol = activeDragState.targetCol || activeDragState.col;
      const targetDayIndex = parseInt(targetCol.dataset.colDay, 10);
      const rect = targetCol.getBoundingClientRect();
      const offsetY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const percentY = offsetY / rect.height;
      const hourFloat = 8 + percentY * 15;
      const startHour = clampCalendarStartHour(roundToNearestInterval(hourFloat, 0.5), activeDragState.durationHours);
      const endHour = Math.min(23, startHour + activeDragState.durationHours);
      const startTime = formatCalendarHour(startHour);
      const endTime = formatCalendarHour(endHour);

      state.updateCalendarEvent(state.activeTripId, activeDragState.eventId, {
        dayIndex: targetDayIndex,
        startTime,
        endTime,
      });
    } else if (!activeDragState.hasMoved) {
      openCalendarEventDrawer(activeDragState.eventId);
    }

    activeDragState = null;
  }
}

function markTapMoved(e) {
  const dx = e.clientX - activeDragState.startX;
  const dy = e.clientY - activeDragState.startY;
  if (Math.hypot(dx, dy) > 8) activeDragState.hasMoved = true;
}

function handleResizeMove(e) {
  e.preventDefault();
  const rect = activeDragState.col.getBoundingClientRect();
  const offsetY = Math.max(20, Math.min(rect.height, e.clientY - rect.top));
  const cardTopPercent = parseFloat(activeDragState.card.style.top) || 0;
  const startHours = 8 + (cardTopPercent / 100) * 15;
  const endHours = 8 + (offsetY / rect.height) * 15;

  if (endHours > startHours + 0.25) {
    const endH = Math.min(23, Math.floor(endHours));
    const endM = Math.round(((endHours - endH) * 60) / 15) * 15;
    const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
    const heightPercent = ((endHours - startHours) / 15) * 100;
    activeDragState.card.style.height = `${Math.min(100, heightPercent)}%`;
    const timeEl = activeDragState.card.querySelector(".event-card__time");
    if (timeEl) {
      const startTime = timeEl.textContent.split("\u2013")[0].trim();
      timeEl.textContent = `${startTime} \u2013 ${endTimeStr}`;
    }
    activeDragState.newEndTime = endTimeStr;
  }
}

function handleCardMove(e) {
  const dx = e.clientX - activeDragState.startX;
  const dy = e.clientY - activeDragState.startY;

  if (Math.hypot(dx, dy) > 8) {
    activeDragState.hasMoved = true;
    e.preventDefault();
    activeDragState.card.classList.add("is-dragging");
    activeDragState.card.style.transform = `translate(${dx}px, ${dy}px) scale(0.98)`;

    const targetElem = document.elementFromPoint(e.clientX, e.clientY);
    const targetCol = targetElem ? targetElem.closest(".calendar-col") : null;

    document.querySelectorAll(".calendar-col").forEach((col) => col.classList.remove("drag-hover"));
    if (targetCol) {
      targetCol.classList.add("drag-hover");
      activeDragState.targetCol = targetCol;
    }
  }
}

function isTouchCalendarViewport() {
  return window.matchMedia?.("(pointer: coarse), (max-width: 540px)")?.matches;
}

function captureCalendarPointer(element, pointerId) {
  try {
    element?.setPointerCapture?.(pointerId);
  } catch {}
}

function releaseCalendarPointer(element, pointerId) {
  try {
    if (element?.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {}
}

function resetActiveCalendarDrag() {
  if (!activeDragState) return;
  releaseCalendarPointer(activeDragState.card, activeDragState.pointerId);
  activeDragState.card?.classList.remove("is-dragging");
  if (activeDragState.card) activeDragState.card.style.transform = "";
  if (activeDragState.type === "resize" && activeDragState.card) {
    activeDragState.card.style.height = activeDragState.initialHeightStyle || activeDragState.card.style.height;
  }
  document.querySelectorAll(".calendar-col").forEach((col) => col.classList.remove("drag-hover"));
  document.querySelectorAll(".timeline-day-group").forEach((group) => group.classList.remove("drag-hover"));
  activeDragState = null;
}

function openCalendarEventDrawer(eventId) {
  const trip = state.activeTrip;
  const evt = (trip.calendarEvents || []).find((event) => event.id === eventId);
  if (evt) {
    state.openEventDrawer("edit", evt);
  }
}

function roundToNearestInterval(value, interval) {
  return Math.round(value / interval) * interval;
}

function clampCalendarStartHour(hour, durationHours) {
  const latestStart = Math.max(8, 23 - durationHours);
  return Math.max(8, Math.min(latestStart, hour));
}

function formatCalendarHour(hourFloat) {
  const hour = Math.floor(hourFloat);
  const minutes = Math.round((hourFloat - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
