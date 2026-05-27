/* @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PopupForm } from "./PopupForm";

vi.mock("@/components/CloudinaryUpload", () => ({
  CloudinaryUpload: ({ label }: { label: string }) =>
    React.createElement("div", { "data-testid": "cloudinary-upload" }, label),
}));

describe("PopupForm integration", () => {
  const byId = (id: string) => {
    const element = document.getElementById(id) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!element) throw new Error(`Missing element with id ${id}`);
    return element;
  };

  it("renders core sections and default visibility state", () => {
    render(
      React.createElement(PopupForm, {
        mode: "create",
        isSubmitting: false,
        serverError: "",
        onBack: () => undefined,
        onSubmitPayload: async () => undefined,
      }),
    );

    expect(screen.getByText("Campaign Setup")).toBeTruthy();
    expect(screen.getByText("Trigger & Constraints")).toBeTruthy();
    expect(screen.getByText("Scope & Targeting")).toBeTruthy();
    expect(screen.getByText("Schedule")).toBeTruthy();
    expect(screen.getByText("Publish")).toBeTruthy();
    expect(screen.getByText(/Visibility:/).textContent).toContain(
      "Visibility: active",
    );
  });

  it("shows scheduling validation error for invalid range on submit", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(PopupForm, {
        mode: "create",
        isSubmitting: false,
        serverError: "",
        onBack: () => undefined,
        onSubmitPayload: async () => undefined,
      }),
    );

    await user.type(byId("popup-name"), "Summer Promo");
    await user.type(byId("popup-title"), "Get 20% Off");
    await user.type(byId("popup-start-date"), "2026-10-11T10:00");
    await user.type(byId("popup-end-date"), "2026-10-10T10:00");

    await user.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(
      await screen.findByText("End date must be after or equal to start date."),
    ).toBeTruthy();
  });

  it("updates visibility state from scheduled to expired based on date inputs", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(PopupForm, {
        mode: "create",
        isSubmitting: false,
        serverError: "",
        onBack: () => undefined,
        onSubmitPayload: async () => undefined,
      }),
    );

    await user.type(byId("popup-start-date"), "2999-01-01T10:00");
    await waitFor(() =>
      expect(screen.getByText(/Visibility:/).textContent).toContain(
        "Visibility: scheduled",
      ),
    );

    await user.clear(byId("popup-start-date"));
    await user.type(byId("popup-end-date"), "2000-01-01T10:00");
    await waitFor(() =>
      expect(screen.getByText(/Visibility:/).textContent).toContain(
        "Visibility: expired",
      ),
    );
  });

  it("submits normalized payload for targeting and dates", async () => {
    const user = userEvent.setup();
    const onSubmitPayload = vi.fn<(payload: unknown) => Promise<void>>(
      async () => undefined,
    );

    render(
      React.createElement(PopupForm, {
        mode: "create",
        isSubmitting: false,
        serverError: "",
        onBack: () => undefined,
        onSubmitPayload,
      }),
    );

    await user.type(byId("popup-name"), " Summer Promo ");
    await user.type(byId("popup-title"), " Get 20% Off ");
    await user.type(byId("popup-show-on-pages"), "/, /events");
    await user.type(byId("popup-linked-event-id"), " evt_123 ");
    await user.type(byId("popup-start-date"), "2026-10-10T10:00");
    await user.type(byId("popup-end-date"), "2026-10-11T10:00");

    await user.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() => expect(onSubmitPayload).toHaveBeenCalledTimes(1));

    const firstCall = onSubmitPayload.mock.calls[0];
    expect(firstCall).toBeTruthy();
    const payload = firstCall?.[0] as Record<string, unknown>;
    expect(payload.name).toBe("Summer Promo");
    expect(payload.title).toBe("Get 20% Off");
    expect(payload.showOnPages).toEqual(["/", "/events"]);
    expect(payload.linkedEventId).toBe("evt_123");
    expect(typeof payload.startDate).toBe("string");
    expect(typeof payload.endDate).toBe("string");
  });
});
