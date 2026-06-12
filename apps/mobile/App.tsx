import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./src/lib/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BattleScreen } from "./src/screens/BattleScreen";
import { JoinScreen } from "./src/screens/JoinScreen";
import { OnlineBattleScreen } from "./src/screens/OnlineBattleScreen";
import { PlazaScreen } from "./src/screens/PlazaScreen";
import { BattleTarget } from "./src/game/useOnlineBattle";
import { ChatCredentials } from "@tomatina/protocol";
import { CoveredScreen } from "./src/screens/CoveredScreen";
import { RevealConsentScreen } from "./src/screens/RevealConsentScreen";
import { FriendlyPassScreen } from "./src/screens/FriendlyPassScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { RoundOutcome } from "./src/game/types";

/** Where the round was played, so rematch can return to the same mode. */
type Origin =
  | { mode: "practice" }
  | { mode: "online"; code: string }
  | { mode: "plaza" };

type Screen =
  | { name: "home" }
  | { name: "auth" }
  | { name: "profile" }
  | { name: "practice" }
  | { name: "join" }
  | { name: "plaza" }
  | { name: "online"; target: BattleTarget }
  | { name: "covered"; outcome: RoundOutcome; origin: Origin }
  | { name: "reveal"; won: boolean; origin: Origin }
  | { name: "pass"; variant: "sent" | "received" }
  | { name: "chat"; title: string; chat: ChatCredentials | null };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  // null = Supabase not configured (auth UI hidden)
  const [signedIn, setSignedIn] = useState<boolean | null>(supabase ? false : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const rematch = (origin: Origin) =>
    setScreen(
      origin.mode === "practice"
        ? { name: "practice" }
        : origin.mode === "plaza"
          ? { name: "plaza" }
          : { name: "online", target: { kind: "code", code: origin.code } },
    );

  return (
    <>
      <StatusBar style="light" />
      {screen.name === "home" && (
        <HomeScreen
          onFindNearby={() =>
            setScreen(signedIn === true ? { name: "plaza" } : { name: "auth" })
          }
          onBattleOnline={() => setScreen({ name: "join" })}
          onPractice={() => setScreen({ name: "practice" })}
          signedIn={signedIn}
          onSignIn={() => setScreen({ name: "auth" })}
          onProfile={() => setScreen({ name: "profile" })}
        />
      )}
      {screen.name === "profile" && (
        <ProfileScreen onClose={() => setScreen({ name: "home" })} />
      )}
      {screen.name === "plaza" && (
        <PlazaScreen
          onMatched={(reservation) =>
            setScreen({ name: "online", target: { kind: "reservation", reservation } })
          }
          onLeave={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "auth" && (
        <AuthScreen
          onDone={() => setScreen({ name: "home" })}
          onCancel={() => setScreen({ name: "home" })}
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
          onJoin={(code) =>
            setScreen({ name: "online", target: { kind: "code", code } })
          }
          onBack={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "online" && (
        <OnlineBattleScreen
          target={screen.target}
          signedIn={signedIn === true}
          onRoundEnd={(outcome) =>
            setScreen({
              name: "covered",
              outcome,
              origin:
                screen.target.kind === "code"
                  ? { mode: "online", code: screen.target.code }
                  : { mode: "plaza" },
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
          onRevealed={(info) =>
            setScreen({ name: "chat", title: info.opponentName, chat: info.chat })
          }
          onRematch={() => rematch(screen.origin)}
          onPassSent={() => setScreen({ name: "pass", variant: "sent" })}
          onPassReceived={() => setScreen({ name: "pass", variant: "received" })}
          onClosed={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "pass" && (
        <FriendlyPassScreen
          variant={screen.variant}
          onDone={() => setScreen({ name: "home" })}
        />
      )}
      {screen.name === "chat" && (
        <ChatScreen
          title={screen.title}
          chat={screen.chat}
          onClose={() => setScreen({ name: "home" })}
        />
      )}
    </>
  );
}
