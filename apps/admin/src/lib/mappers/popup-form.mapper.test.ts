import { describe, expect, it } from "vitest";

import { PopupCampaign } from "@mad/types";

import {
  getDefaultPopupFormValues,
  mapPopupFormToPayload,
  mapPopupToFormValues,
} from "./popup-form.mapper";

describe("popup-form.mapper", () => {
  it("maps entity to form values", () => {
    const popup: PopupCampaign = {
      _id: "pop_1",
      title: "Title",
      trigger: "on_load",
      name: "Campaign",
      showOnPages: ["/events"],
      startDate: "2026-10-10T10:00:00.000Z",
      endDate: "2026-10-11T10:00:00.000Z",
    };

    const values = mapPopupToFormValues(popup);
    expect(values.name).toBe("Campaign");
    expect(values.showOnPages).toBe("/events");
  });

  it("maps form values to normalized payload", () => {
    const values = getDefaultPopupFormValues();
    values.name = " Summer ";
    values.title = " Promo ";
    values.showOnPages = "/, /events";
    values.startDate = "2026-10-10T10:00";
    values.endDate = "2026-10-11T10:00";

    const payload = mapPopupFormToPayload(values);
    expect(payload.name).toBe("Summer");
    expect(payload.title).toBe("Promo");
    expect(payload.showOnPages).toEqual(["/", "/events"]);
    expect(typeof payload.startDate).toBe("string");
  });
});
