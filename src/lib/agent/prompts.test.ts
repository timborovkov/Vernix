import { describe, it, expect } from "vitest";
import {
  getAgentSystemPrompt,
  getVoiceAgentSystemPrompt,
  type ToolDescription,
} from "./prompts";

const sampleTools: ToolDescription[] = [
  { name: "mcp__abc__lookup", description: "Look up customer data" },
  { name: "mcp__abc__create", description: "Create a ticket" },
];

describe("getAgentSystemPrompt", () => {
  it("includes base prompt and post-meeting features", () => {
    const prompt = getAgentSystemPrompt();
    expect(prompt).toContain("KiviKova");
    expect(prompt).toContain("searchMeetingContext");
    expect(prompt).toContain("summary of the meeting");
    expect(prompt).toContain("Action items");
  });

  it("appends agenda when provided", () => {
    const prompt = getAgentSystemPrompt("Review Q3 goals");
    expect(prompt).toContain("Meeting Agenda:");
    expect(prompt).toContain("Review Q3 goals");
  });

  it("appends MCP tool descriptions when provided", () => {
    const prompt = getAgentSystemPrompt(null, sampleTools);
    expect(prompt).toContain("external tools");
    expect(prompt).toContain("mcp__abc__lookup: Look up customer data");
    expect(prompt).toContain("mcp__abc__create: Create a ticket");
  });

  it("includes both agenda and tools", () => {
    const prompt = getAgentSystemPrompt("Sprint review", sampleTools);
    expect(prompt).toContain("Sprint review");
    expect(prompt).toContain("mcp__abc__lookup");
    // Tools section comes before agenda
    const toolsIdx = prompt.indexOf("external tools");
    const agendaIdx = prompt.indexOf("Meeting Agenda:");
    expect(toolsIdx).toBeLessThan(agendaIdx);
  });

  it("omits tools section when empty array provided", () => {
    const prompt = getAgentSystemPrompt(null, []);
    expect(prompt).not.toContain("external tools");
  });
});

describe("getVoiceAgentSystemPrompt", () => {
  it("includes voice-specific instructions and post-meeting features", () => {
    const prompt = getVoiceAgentSystemPrompt();
    expect(prompt).toContain("video call");
    expect(prompt).toContain("search_meeting_context");
    expect(prompt).toContain("summary of the meeting");
    expect(prompt).toContain("Action items");
  });

  it("appends agenda when provided", () => {
    const prompt = getVoiceAgentSystemPrompt("Discuss roadmap");
    expect(prompt).toContain("Meeting Agenda:");
    expect(prompt).toContain("Discuss roadmap");
  });

  it("appends MCP tool descriptions when provided", () => {
    const prompt = getVoiceAgentSystemPrompt(null, sampleTools);
    expect(prompt).toContain("external tools");
    expect(prompt).toContain("mcp__abc__lookup: Look up customer data");
  });
});
