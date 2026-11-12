/**
 * Static stand-in for a single event when GET /api/customer/events/{id}
 * is unavailable. Detail stays login-gated on the backend (show), unlike
 * the public list. Do not change src/lib/api/events.ts — this module is
 * the fallback used by src/lib/api/event-detail.ts.
 */

import type { EventCommentsPage } from "@/lib/api/types";
import { mockEvents, type EventItem } from "@/lib/mock/events";

export interface EventDetail extends EventItem {
  description: string | null;
  descriptionKey: "djNight" | "ladies" | "liveBand" | null;
}

const DESCRIPTIONS: Record<number, { description: string; descriptionKey: EventDetail["descriptionKey"] }> = {
  1: {
    descriptionKey: "djNight",
    description:
      "Resident and guest DJs take over the main hall. Doors open at 9 PM, peak set from 11 PM till late. Dress to impress.",
  },
  2: {
    descriptionKey: "ladies",
    description:
      "Every Friday, ladies drink free from 9 to 11 PM. Bring your friends and claim the offer at the bar with a valid ID.",
  },
  3: {
    descriptionKey: "liveBand",
    description:
      "Live band on the floor with a mix of pop, R&B and classics. Arrive early for a better view of the stage.",
  },
};

export const mockEventDetails: EventDetail[] = mockEvents.map((event) => ({
  ...event,
  description: DESCRIPTIONS[event.id]?.description ?? null,
  descriptionKey: DESCRIPTIONS[event.id]?.descriptionKey ?? null,
}));

export function findMockEventDetail(id: number): EventDetail | null {
  return mockEventDetails.find((event) => event.id === id) ?? null;
}

/** Dev-only stand-in comments (src/lib/mock/devFallback.ts); fixed timestamps keep renders stable. */
export function mockEventCommentsPage(eventId: number): EventCommentsPage {
  const rows = [
    { name: "Alicia", body: "Can't wait for this one!" },
    { name: "Jason", body: "Last week was amazing, see you there." },
    { name: "Mei", body: "Is there a dress code?" },
  ];
  return {
    data: rows.map((row, index) => ({
      id: eventId * 100 + index + 1,
      body: row.body,
      created_at: `2026-11-0${index + 1}T12:00:00+08:00`,
      mine: false,
      customer: { id: 9000 + index, name: row.name, avatar_url: null },
    })),
    current_page: 1,
    last_page: 1,
    total: rows.length,
  };
}
