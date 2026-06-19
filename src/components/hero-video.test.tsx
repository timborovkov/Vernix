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

  it("handles synchronous play failures without leaving playback pending", () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => {
        throw new DOMException("Playback failed.", "AbortError");
      });

    render(<HeroVideo />);

    fireEvent.click(screen.getByRole("button", { name: /play demo video/i }));

    const button = screen.getByRole("button", { name: /play demo video/i });
    expect(play).toHaveBeenCalledOnce();
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("ignores repeated clicks while playback is starting", () => {
    let resolvePlay: () => void = () => {};
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePlay = resolve;
          })
      );

    const { container } = render(<HeroVideo />);
    const button = screen.getByRole("button", { name: /play demo video/i });
    const video = container.querySelector("video");
    if (!video) throw new Error("Expected hero video to render");

    fireEvent.click(button);
    fireEvent.click(button);

    expect(play).toHaveBeenCalledOnce();
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");

    resolvePlay();
    fireEvent.play(video);

    expect(
      screen.queryByRole("button", { name: /play demo video/i })
    ).toBeNull();
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
