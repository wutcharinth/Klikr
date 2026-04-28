import React from "react";
import { Composition } from "remotion";
import { LogoMark } from "./compositions/LogoMark";
import { HeroProductAnimation } from "./compositions/HeroProductAnimation";
import { PollMotion } from "./compositions/PollMotion";
import { WordCloudMotion } from "./compositions/WordCloudMotion";
import { QAMotion } from "./compositions/QAMotion";
import { QuizMotion } from "./compositions/QuizMotion";
import { AIDeckGenerationMotion } from "./compositions/AIDeckGenerationMotion";
import { HowItWorksMotion } from "./compositions/HowItWorksMotion";
import { defaultTheme } from "./theme/tokens";

// Studio entry point. Compositions are listed here so `npx remotion studio`
// can author them. The app itself imports compositions directly via
// components/remotion/* wrappers, not through Studio.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LogoMark-idle"
        component={LogoMark}
        durationInFrames={180}
        fps={30}
        width={640}
        height={200}
        defaultProps={{ theme: defaultTheme, variant: "idle" as const, wordmark: "Klikr" }}
      />
      <Composition
        id="LogoMark-wake"
        component={LogoMark}
        durationInFrames={48}
        fps={30}
        width={640}
        height={200}
        defaultProps={{ theme: defaultTheme, variant: "wake" as const, wordmark: "Klikr" }}
      />
      <Composition
        id="LogoMark-react"
        component={LogoMark}
        durationInFrames={24}
        fps={30}
        width={640}
        height={200}
        defaultProps={{ theme: defaultTheme, variant: "react" as const, wordmark: "Klikr" }}
      />
      <Composition
        id="LogoMark-outro"
        component={LogoMark}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme, variant: "outro" as const, wordmark: "Klikr" }}
      />
      <Composition
        id="HeroProductAnimation"
        component={HeroProductAnimation}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme }}
      />
      <Composition
        id="PollMotion"
        component={PollMotion}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme }}
      />
      <Composition
        id="WordCloudMotion"
        component={WordCloudMotion}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme }}
      />
      <Composition
        id="QAMotion"
        component={QAMotion}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme }}
      />
      <Composition
        id="QuizMotion"
        component={QuizMotion}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme }}
      />
      <Composition
        id="AIDeckGenerationMotion"
        component={AIDeckGenerationMotion}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ theme: defaultTheme }}
      />
      <Composition
        id="HowItWorksMotion"
        component={HowItWorksMotion}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={520}
        defaultProps={{ theme: defaultTheme }}
      />
    </>
  );
};
