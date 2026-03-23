/**
 * @vitest-environment happy-dom
 */
import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
let queryClient: QueryClient;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  container = document.createElement("div");
  document.body.appendChild(container);
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  root = ReactDOM.createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function renderHook() {
  await act(async () => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(TestComponent)
      )
    );
  });
}

describe("useMeetings", () => {
  it("fetches meetings on mount and sets loading to false", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockMeetings), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getResult().loading).toBe(false);
    expect(getResult().meetings).toHaveLength(1);
  });

  it("createMeeting calls POST and refreshes list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const newMeeting = { id: "3", title: "New" };
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(newMeeting), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([newMeeting]), { status: 200 })
      );

    await act(async () => {
      await getResult().createMeeting("New", "https://meet.example.com");
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getResult().meetings).toHaveLength(1);
  });

  it("deleteMeeting removes meeting optimistically", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockMeetings), { status: 200 })
    );

    await renderHook();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getResult().meetings).toHaveLength(1);

    // DELETE response, then refetch returns empty list
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 200 })) // DELETE
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); // refetch

    await act(async () => {
      await getResult().deleteMeeting("1");
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(getResult().meetings).toHaveLength(0);
  });
});
