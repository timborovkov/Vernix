import "./index.css";
import { Composition } from "remotion";
import { z } from "zod";
import { DemoVideo } from "./Composition";
import { calculateVideoMetadata } from "./lib/audio-metadata";
import { VIDEO } from "./theme";

const demoVideoSchema = z.object({
  sceneDurations: z.array(z.number()),
});

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      schema={demoVideoSchema}
      durationInFrames={VIDEO.fps * 90}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ sceneDurations: [] }}
      calculateMetadata={async () => {
        const meta = await calculateVideoMetadata();
        return {
          durationInFrames: meta.durationInFrames,
          fps: meta.fps,
          width: meta.width,
          height: meta.height,
          props: meta.props,
        };
      }}
    />
  );
};
