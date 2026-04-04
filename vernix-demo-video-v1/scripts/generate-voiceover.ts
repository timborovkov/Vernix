import { writeFileSync, mkdirSync, existsSync } from "fs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Daniel = "onwK4e9ZLuTAKqWW03F9", Adam = "pNInz6obpgDQGcFmaJgB", Rachel = "21m00Tcm4TlvDq8ikWAM"
const VOICE_ID = process.env.VOICE_ID || "onwK4e9ZLuTAKqWW03F9";

if (!ELEVENLABS_API_KEY) {
  console.error(
    "ELEVENLABS_API_KEY is required. Set it in .env or environment.",
  );
  process.exit(1);
}

const scenes = [
  {
    id: "01-hook",
    text: "What if your meetings just answered back?",
  },
  {
    id: "02-how-it-works",
    text: "Paste a link. Vernix joins as a participant. No plugins, no extensions.",
  },
  {
    id: "03-transcript",
    text: "Every word is transcribed in real time — with speaker names.",
  },
  {
    id: "04-hero",
    text: "During the call, ask Vernix anything. It pulls answers straight from your connected tools. Sprint status from Linear. Customer history from your CRM. Nobody leaves the call.",
  },
  {
    id: "05-integrations",
    text: "Connect Slack, Linear, GitHub — dozens of integrations. Set it up once.",
  },
  {
    id: "06-after-call",
    text: "When the call ends — summaries, action items, and semantic search across every call.",
  },
  {
    id: "07-cta",
    text: "Try Vernix for free today and never lose an answer in a meeting again.",
  },
];

const outDir = "public/audio/voiceover";
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const scene of scenes) {
  const outPath = `${outDir}/${scene.id}.mp3`;
  if (existsSync(outPath)) {
    console.log(`Skipping ${scene.id} (already exists)`);
    continue;
  }
  console.log(`Generating ${scene.id}...`);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: scene.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    },
  );
  if (!response.ok) {
    console.error(
      `Failed ${scene.id}: ${response.status} ${await response.text()}`,
    );
    continue;
  }
  const buf = Buffer.from(await response.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
}
console.log("Done.");
