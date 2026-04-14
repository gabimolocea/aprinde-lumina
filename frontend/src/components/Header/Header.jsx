import Candle from "../Candle/Candle";
import { useWallMeta } from "../../hooks/useWallMeta";
import "./Header.css";

const DECO_CANDLE = { col: 4, row: 7, dedication_type: "vii", has_photo: false };

export default function Header({ user, onLogout }) {
  const { data: meta } = useWallMeta();
  const count = meta?.total_lit_count ?? null;

  return (
    <header className="header">
      <div className="header__top">
        <h1 className="header__title">
          <span className="header__deco-candle">
            <Candle candle={DECO_CANDLE} />
          </span>
          {" "}Lumânar
        </h1>
        {count !== null && (
          <span className="header__candle-count">
            <span className="header__deco-candle">
              <Candle candle={DECO_CANDLE} />
            </span>
            {count.toLocaleString("ro-RO")} lumânări aprinse
          </span>
        )}
        {user && (
          <button className="header__logout" onClick={onLogout}>
            Ieși
          </button>
        )}
      </div>
    </header>
  );
}
