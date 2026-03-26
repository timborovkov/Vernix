import { verifyBotSecret } from "./verify-bot-secret";

describe("verifyBotSecret", () => {
  it("accepts valid voiceSecret", () => {
    expect(verifyBotSecret({ voiceSecret: "abc" }, "abc")).toBe(true);
  });

  it("accepts valid botId", () => {
    expect(verifyBotSecret({ botId: "bot-1" }, "bot-1")).toBe(true);
  });

  it("rejects mismatched secret", () => {
    expect(
      verifyBotSecret({ voiceSecret: "abc", botId: "bot-1" }, "wrong")
    ).toBe(false);
  });

  it("rejects empty metadata", () => {
    expect(verifyBotSecret({}, "any")).toBe(false);
  });

  it("rejects non-string voiceSecret", () => {
    expect(verifyBotSecret({ voiceSecret: 123 }, "123")).toBe(false);
  });
});
