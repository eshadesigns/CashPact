import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContract } from "../ContractContext";

const API = (import.meta.env.VITE_API_URL || "/api").trim().replace(/\/$/, "");

export default function LoginPage() {
  const nav = useNavigate();
  const { setContract } = useContract();

  const [username, setUsername] = useState("");
  const [friendUsername, setFriendUsername] = useState("");
  const [dailyGoalCount, setDailyGoalCount] = useState(5);
  const stakeAmount = 100;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !friendUsername.trim()) {
      setError("Please enter both usernames.");
      return;
    }

    const payload = {
      username: username.trim(),
      friendUsername: friendUsername.trim(),
      dailyGoalCount: Number(dailyGoalCount),
      stakeAmount,
    };

    try {
      setLoading(true);

      const res = await fetch(`${API}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Setup failed");

      setContract({
        ...payload,
        contractId: data.contractId || null,
        userId: data.userId || null,
        friendId: data.friendId || null,
        balances: data.balances || {
          [payload.username]: 500,
          [payload.friendUsername]: 500,
        },
        friends: data.friends || [payload.friendUsername],
      });

      nav("/braindump");
    } catch (err) {
      setError(err.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={bgOrbOne} />
      <div style={bgOrbTwo} />
      <div style={bgGrid} />

      <div style={cardStyle}>
        <p style={kickerStyle}>IdeaNet Contract Setup</p>
        <h1 style={titleStyle}>Lock in your daily accountability pact</h1>
        <p style={subtitleStyle}>
          Set your teammate, required daily completions, and demo stake. If you miss your target,
          part of your stake moves automatically.
        </p>

        <div style={chipsRow}>
          <span style={chip}>Daily habit loop</span>
          <span style={chip}>Auto-evaluation</span>
          <span style={chip}>Demo stake: $100</span>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="vedhi"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Friend username</span>
            <input
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="esha"
              style={inputStyle}
            />
          </label>

          <div style={twoColRow}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Daily goal count</span>
              <input
                type="number"
                min={1}
                max={20}
                value={dailyGoalCount}
                onChange={(e) => setDailyGoalCount(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Stake amount</span>
              <input value="$100 (fixed)" disabled style={{ ...inputStyle, opacity: 0.72 }} />
            </label>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <button disabled={loading} style={buttonStyle}>
            {loading ? "Creating contract..." : "Continue to BrainDump"}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  padding: "30px 16px",
  background:
    "radial-gradient(1000px 460px at 15% 12%, rgba(255,145,77,0.2), transparent 60%)," +
    "radial-gradient(700px 440px at 88% 18%, rgba(0,211,173,0.2), transparent 62%)," +
    "#0f151a",
  color: "#edf3f8",
  fontFamily: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
};

const bgOrbOne = {
  position: "absolute",
  width: 300,
  height: 300,
  borderRadius: "50%",
  left: -80,
  top: "12%",
  filter: "blur(70px)",
  background: "rgba(255, 127, 80, 0.22)",
  pointerEvents: "none",
};

const bgOrbTwo = {
  position: "absolute",
  width: 360,
  height: 360,
  borderRadius: "50%",
  right: -120,
  top: "30%",
  filter: "blur(80px)",
  background: "rgba(0, 200, 170, 0.2)",
  pointerEvents: "none",
};

const bgGrid = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
  maskImage: "radial-gradient(circle at center, black 45%, transparent 100%)",
  pointerEvents: "none",
};

const cardStyle = {
  width: "min(760px, 94vw)",
  borderRadius: 26,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "linear-gradient(165deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))",
  boxShadow: "0 22px 80px rgba(0,0,0,0.42)",
  padding: "32px clamp(18px, 5vw, 38px)",
  backdropFilter: "blur(10px)",
  position: "relative",
  zIndex: 2,
};

const kickerStyle = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  opacity: 0.82,
  fontWeight: 700,
};

const titleStyle = {
  margin: "8px 0 10px",
  fontSize: "clamp(26px, 4vw, 40px)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const subtitleStyle = {
  margin: "0 0 16px",
  opacity: 0.85,
  maxWidth: 620,
  lineHeight: 1.5,
};

const chipsRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 20,
};

const chip = {
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  background: "rgba(255,255,255,0.06)",
  opacity: 0.92,
};

const formStyle = {
  display: "grid",
  gap: 14,
};

const fieldStyle = {
  display: "grid",
  gap: 7,
};

const labelStyle = {
  fontSize: 13,
  opacity: 0.85,
  fontWeight: 600,
};

const twoColRow = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(3, 8, 12, 0.45)",
  color: "#f2f7fb",
  outline: "none",
  fontSize: 15,
};

const errorStyle = {
  color: "#ffc1bc",
  border: "1px solid rgba(255,100,89,0.45)",
  background: "rgba(255,100,89,0.14)",
  borderRadius: 12,
  padding: "9px 11px",
  fontSize: 14,
};

const buttonStyle = {
  marginTop: 4,
  padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "linear-gradient(120deg, #ff9150, #ffc857)",
  color: "#1b1f24",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(255,150,70,0.35)",
};

