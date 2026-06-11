import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BattleScreen } from "./src/screens/BattleScreen";
import { JoinScreen } from "./src/screens/JoinScreen";
import { OnlineBattleScreen } from "./src/screens/OnlineBattleScreen";
import { CoveredScreen } from "./src/screens/CoveredScreen";
import { RevealConsentScreen } from "./src/screens/RevealConsentScreen";
import { FriendlyPassScreen } from "./src/screens/FriendlyPassScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { RoundOutcome } from "./src/game/types";

/** Where the round was played, so rematch can return to the same mode. */
type Origin = { mode: "practice" } | { mode: "online"; code: string };

type Screen =
  | { name: "home" }
  | { name: "practice" }
  | { name: "join" }
  | { name: "online"; code: string }
  | { name: "covered"; outcome: RoundOutcome; origin: Origin }
  | { name: "reveal"; won: boolean; origin: Origin }
  | { name: "pass" }
  | { name: "chat" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  const rematch = (origin: Origin) =>
    setScreen(
      origin.mode === "practice"
        ? { name: "practice" }
        : { name: "online", code: origin.code },
    );

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
          onRoundEnd={(outcome) =>
            setScreen({ name: "covered", outcome, origin: { mode: "practice" } })
          }
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
          onRoundEnd={(outcome) =>
            setScreen({
              name: "covered",
              outcome,
              origin: { mode: "online", code: screen.code },
            })
          }
          onLeave={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "covered" && (
        <CoveredScreen
          outcome={screen.outcome}
          onContinue={() =>
            // No reveal gate when the opponent left — there's no one to
            // consent with. Reveal only follows a completed battle.
            setScreen(
              screen.outcome === "opponentLeft"
                ? { name: "home" }
                : {
                    name: "reveal",
                    won: screen.outcome === "coveredThem",
                    origin: screen.origin,
                  },
            )
          }
        />
      )}
      {screen.name === "reveal" && (
        <RevealConsentScreen
          role={screen.won ? "winner" : "loser"}
          onReveal={() => setScreen({ name: "chat" })}
          onRematch={() => rematch(screen.origin)}
          onPass={() => setScreen({ name: "pass" })}
        />
      )}
      {screen.name === "pass" && (
        <FriendlyPassScreen onDone={() => setScreen({ name: "home" })} />
      )}
      {screen.name === "chat" && (
        <ChatScreen onClose={() => setScreen({ name: "home" })} />
      )}
    </>
  );
}
