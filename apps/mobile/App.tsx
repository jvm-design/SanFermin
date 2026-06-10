import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BattleScreen } from "./src/screens/BattleScreen";
import { JoinScreen } from "./src/screens/JoinScreen";
import { OnlineBattleScreen } from "./src/screens/OnlineBattleScreen";
import { CoveredScreen } from "./src/screens/CoveredScreen";
import { RevealConsentScreen } from "./src/screens/RevealConsentScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { RoundOutcome } from "./src/game/types";

type Screen =
  | { name: "home" }
  | { name: "practice" }
  | { name: "join" }
  | { name: "online"; code: string }
  | { name: "covered"; outcome: RoundOutcome }
  | { name: "reveal" }
  | { name: "chat" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  return (
    <>
      <StatusBar style="light" />
      {screen.name === "home" && (
        <HomeScreen
          onBattleOnline={() => setScreen({ name: "join" })}
          onPractice={() => setScreen({ name: "practice" })}
        />
      )}
      {screen.name === "practice" && (
        <BattleScreen
          onRoundEnd={(outcome) => setScreen({ name: "covered", outcome })}
          onLeave={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "join" && (
        <JoinScreen
          onJoin={(code) => setScreen({ name: "online", code })}
          onBack={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "online" && (
        <OnlineBattleScreen
          code={screen.code}
          onRoundEnd={(outcome) => setScreen({ name: "covered", outcome })}
          onLeave={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "covered" && (
        <CoveredScreen
          outcome={screen.outcome}
          onContinue={() =>
            // No reveal gate when the opponent left — there's no one to
            // consent with. Reveal only follows a completed battle.
            setScreen(screen.outcome === "opponentLeft" ? { name: "home" } : { name: "reveal" })
          }
        />
      )}
      {screen.name === "reveal" && (
        <RevealConsentScreen
          onReveal={() => setScreen({ name: "chat" })}
          onDecline={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "chat" && (
        <ChatScreen onClose={() => setScreen({ name: "home" })} />
      )}
    </>
  );
}
