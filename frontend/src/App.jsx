import { useState, useCallback, useRef } from "react";
import { useAuth } from "./context/AuthContext";
import Wall from "./components/Wall/Wall";
import LightCandleModal from "./components/LightCandleModal/LightCandleModal";
import CandleDetailModal from "./components/CandleDetailModal/CandleDetailModal";
import Header from "./components/Header/Header";
import LoginScreen from "./components/LoginScreen/LoginScreen";

export default function App() {
  const { user, logout } = useAuth();

  const [pendingSlot, setPendingSlot] = useState(null);
  const [viewCandleId, setViewCandleId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [litSlotKey, setLitSlotKey] = useState(null);
  const litTimerRef = useRef(null);

  const handleLit = useCallback((col, row) => {
    if (litTimerRef.current) clearTimeout(litTimerRef.current);
    setLitSlotKey(`${col},${row}`);
    litTimerRef.current = setTimeout(() => setLitSlotKey(null), 6000);
  }, []);

  return (
    <>
      <Header user={user} onLogout={logout} />
      <Wall
        onEmptySlotClick={(col, row) => setPendingSlot({ col, row })}
        onCandleClick={(id) => setViewCandleId(id)}
        litSlotKey={litSlotKey}
      />

      {/* Standalone login (header button) — no slot context */}
      {showLogin && (
        <LoginScreen onClose={() => setShowLogin(false)} />
      )}

      {/* Candle modal handles auth itself if user is not logged in */}
      {pendingSlot && (
        <LightCandleModal
          slot={pendingSlot}
          onClose={() => setPendingSlot(null)}
          onLit={handleLit}
        />
      )}

      {viewCandleId && (
        <CandleDetailModal
          candleId={viewCandleId}
          onClose={() => setViewCandleId(null)}
        />
      )}
    </>
  );
}
