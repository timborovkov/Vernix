/**
 * @vitest-environment happy-dom
 */
import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";
import { useMeetings } from "./use-meetings";

const mockMeetings = [
  {
    id: "1",
    title: "Meeting 1",
    status: "pending",
    joinLink: "https://example.com",
    qdrantCollectionName: "c1",
    participants: [],
    metadata: {},
    startedAt: null,
    endedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

type HookResult = ReturnType<typeof useMeetings>;
let getResult: () => HookResult;

function TestComponent() {
  const result = useMeetings();
  const resultRef = useRef(result);

  useEffect(() => {
    resultRef.current = result;
  });

  getResult = () => resultRef.current;
  return null;
}

let container: HTMLDivElement;
let root: ReactDOM.Root;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  container = document.createElement("div");
  document.body.appendChild(container);
  root = ReactDOM.createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function renderHook() {
  await act(async () => {
    root.render(React.createElement(TestComponent));
  });
}

describe("useMeetings", () => {
  it("fetches meetings on mount and sets loading to false", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMeetings), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(getResult().loading).toBe(false);
    expect(getResult().meetings).toHaveLength(1);
  });

  it("createMeeting calls POST and prepends to list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const newMeeting = { id: "3", title: "New" };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(newMeeting), { status: 201 })
    );

    await act(async () => {
      await getResult().createMeeting("New", "https://meet.example.com");
    });

    expect(getResult().meetings).toHaveLength(1);
    expect(getResult().meetings[0].id).toBe("3");
  });

  it("deleteMeeting removes meeting from list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMeetings), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await act(async () => {
      await getResult().deleteMeeting("1");
    });

    expect(getResult().meetings).toHaveLength(0);
  });

  it("createMeeting throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("err", { status: 500 })
    );

    await expect(
      act(() => getResult().createMeeting("X", "https://x.com"))
    ).rejects.toThrow("Failed to create meeting");
  });
});
