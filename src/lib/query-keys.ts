export const queryKeys = {
  meetings: {
    all: ["meetings"] as const,
    detail: (id: string) => ["meetings", id] as const,
    transcript: (id: string) => ["meetings", id, "transcript"] as const,
  },
  tasks: {
    byMeeting: (id: string) => ["tasks", "meeting", id] as const,
    all: ["tasks"] as const,
  },
  knowledge: {
    all: (meetingId?: string) => ["knowledge", meetingId ?? "global"] as const,
  },
  apiKeys: { all: ["api-keys"] as const },
  mcpServers: { all: ["mcp-servers"] as const },
  profile: { all: ["profile"] as const },
  billing: { all: ["billing"] as const },
};
