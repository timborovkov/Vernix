/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroVideo } from "./hero-video";

describe("HeroVideo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles interrupted play requests without leaving playback pending", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValue(
        new DOMException(
          "The play() request was interrupted by a call to pause().",
          "AbortError"
        )
      );

    render(<HeroVideo />);

    fireEvent.click(screen.getByRole("button", { name: /play demo video/i }));

    expect(play).toHaveBeenCalledOnce();
    expect(
      screen
        .getByRole("button", { name: /play demo video/i })
        .getAttribute("aria-busy")
    ).toBe("true");

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: /play demo video/i })
          .getAttribute("aria-busy")
      ).toBe("false");
    });
  });

  it("shows native controls only after playback actually starts", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);

    const { container } = render(<HeroVideo />);
    const video = container.querySelector("video");
    if (!video) throw new Error("Expected hero video to render");

    fireEvent.click(screen.getByRole("button", { name: /play demo video/i }));

    expect(video.hasAttribute("controls")).toBe(false);

    fireEvent.play(video);

    expect(video.hasAttribute("controls")).toBe(true);
  });
});
