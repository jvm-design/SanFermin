import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BattleScreen } from "./src/screens/BattleScreen";
import { CoveredScreen } from "./src/screens/CoveredScreen";
import { RevealConsentScreen } from "./src/screens/RevealConsentScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { RoundOutcome } from "./src/game/types";

type Screen =
  | { name: "home" }
  | { name: "battle" }
  | { name: "covered"; outcome: RoundOutcome }
  | { name: "reveal" }
  | { name: "chat" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  return (
    <>
      <StatusBar style="light" />
      {screen.name === "home" && (
        <HomeScreen onStart={() => setScreen({ name: "battle" })} />
      )}
      {screen.name === "battle" && (
        <BattleScreen
          onRoundEnd={(outcome) => setScreen({ name: "covered", outcome })}
          onLeave={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "covered" && (
        <CoveredScreen
          outcome={screen.outcome}
          onContinue={() => setScreen({ name: "reveal" })}
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
