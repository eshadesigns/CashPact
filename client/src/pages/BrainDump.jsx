import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useContract } from "../ContractContext";

const API = (import.meta.env.VITE_API_URL || "/api").trim().replace(/\/$/, "");

function BrainDump() {
  const navigate = useNavigate();
  const { setContract } = useContract();

  const [ideas, setIdeas] = useState([]);
  const [text, setText] = useState("");
  const [similarities, setSimilarities] = useState([]);
  const [loading, setLoading] = useState(true);

  function addIdea() {
    if (!text.trim()) return;
    const newIdea = { id: `local-${Date.now()}`, text: text.trim(), done: false };
    setIdeas((prev) => [...prev, newIdea]);
    setText("");
  }

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await fetch(`${API}/nodes`);
        const nodes = await res.json();
        if (Array.isArray(nodes)) {
          setIdeas(
            nodes.map((n) => ({
              id: n.id,
              text: n.text,
              done: n.status === "done",
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load nodes:", e);
      } finally {
        setLoading(false);
      }
    }
    loadNodes();
  }, []);

  useEffect(() => {
    if (ideas.length < 2) {
      setSimilarities([]);
      return;
    }

    function computeLocalSimilarities(arr) {
      const toks = (s) => s.toLowerCase().split(/\W+/).filter(Boolean);
      const sets = arr.map((t) => new Set(toks(t)));
      const pairs = [];

      for (let i = 0; i < sets.length; i++) {
        for (let j = i + 1; j < sets.length; j++) {
          const a = sets[i];
          const b = sets[j];
          const inter = Array.from(a).filter((w) => b.has(w)).length;
          const union = new Set([...a, ...b]).size || 1;
          pairs.push({ i, j, score: inter / union });
        }
      }

      return pairs.sort((x, y) => y.score - x.score);
    }

    async function fetchSimilarities() {
      try {
        const res = await fetch(`${API}/similarity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ideas: ideas.map((i) => i.text) }),
        });
        const data = await res.json();
        if (data && Array.isArray(data.similarities) && data.similarities.length) {
          setSimilarities(data.similarities);
        } else {
          setSimilarities(computeLocalSimilarities(ideas.map((i) => i.text)));
        }
      } catch (e) {
        setSimilarities(computeLocalSimilarities(ideas.map((i) => i.text)));
      }
    }

    fetchSimilarities();
  }, [ideas]);

  function goToSynthesize() {
    navigate("/synthesize", { state: { ideas } });
  }

  function logout() {
    setContract(null);
    localStorage.removeItem("contract");
    navigate("/");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 900px at 25% 20%, rgba(106, 206, 119, 0.28), transparent 50%)," +
          "radial-gradient(900px 900px at 20% 70%, rgba(149, 61, 126, 0.2), transparent 55%)," +
          "radial-gradient(800px 450px at 90% 30%, rgba(0,198,255,0.20), transparent 55%)," +
          "#0f0620",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <button
        onClick={logout}
        title="Log out"
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(0,0,0,0.28)",
          color: "white",
          fontSize: 18,
          cursor: "pointer",
          zIndex: 6,
        }}
      >
        ?
      </button>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "0.04em" }}>IdeaNet</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>{loading ? "Loading..." : "Think. Connect. Act."}</div>
      </div>

      <div
        style={{
          position: "relative",
          height: "calc(100vh - 170px)",
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 0,
          }}
        >
          {similarities.map((sim) => {
            const { i, j, score } = sim;
            if (score < 0.3 || !ideas[i] || !ideas[j]) return null;
            return (
              <line
                key={`${ideas[i].id}-${ideas[j].id}`}
                x1={`${(i * 97) % 80 + 8}%`}
                y1={`${(i * 53) % 70 + 10}%`}
                x2={`${(j * 97) % 80 + 8}%`}
                y2={`${(j * 53) % 70 + 10}%`}
                stroke="rgba(148, 147, 147, 0.93)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {ideas.map((idea, idx) => (
          <div
            key={idea.id}
            className="idea-bubble"
            style={{
              position: "absolute",
              left: `${(idx * 97) % 80 + 8}%`,
              top: `${(idx * 53) % 70 + 10}%`,
              transform: "translate(-50%, -50%)",
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(150,120,255,0.16)",
              border: "1px solid rgba(255,255,255,0.18)",
              zIndex: 1,
              boxShadow: "0 0 18px rgba(103,77,255,0.45), 0 0 40px rgba(0,198,255,0.18)",
            }}
          >
            {idea.text}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 18,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "min(900px, 94vw)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 999,
            padding: 10,
            display: "flex",
            gap: 10,
            alignItems: "center",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 35px rgba(0,0,0,0.35)",
            pointerEvents: "auto",
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type an idea..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "white",
              fontSize: 15,
              padding: "10px 12px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") addIdea();
            }}
          />

          <button onClick={addIdea} disabled={!text.trim()} className="brain-btn" style={pillBtn(false, !text.trim())}>
            Add
          </button>

          <button
            onClick={goToSynthesize}
            disabled={ideas.length === 0}
            className="brain-btn brain-btn-primary"
            style={pillBtn(true, ideas.length === 0)}
          >
            Synthesize \u2192
          </button>
        </div>
      </div>
    </div>
  );

  function pillBtn(primary, disabled) {
    return {
      padding: "10px 14px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.18)",
      background: primary ? "rgba(103,77,255,0.65)" : "rgba(255,255,255,0.10)",
      color: "white",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      fontWeight: 600,
      whiteSpace: "nowrap",
      transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
    };
  }
}

export default BrainDump;

