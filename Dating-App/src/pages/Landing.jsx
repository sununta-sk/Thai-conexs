import { useState } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const demoChatId = import.meta.env.VITE_DEMO_CHAT_ID;
  const [apiStatus, setApiStatus] = useState("idle"); // idle | loading | ok | error
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState("");

  const checkApi = async () => {
    setApiStatus("loading");
    setApiData(null);
    setApiError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setApiData(data);
      setApiStatus("ok");
    } catch (err) {
      setApiStatus("error");
      setApiError(err?.message || "Unknown error");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 44, fontWeight: 800, marginBottom: 10 }}>
        A Thai dating experience, built for trust.
      </h1>

      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        MVP skeleton: login, profiles, matching, messaging (Week 1 demo).
      </p>

      {/* ✅ Backend health check */}
      <button
        onClick={checkApi}
        disabled={apiStatus === "loading"}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.2)",
          background: apiStatus === "ok" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
          cursor: apiStatus === "loading" ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {apiStatus === "loading" ? "Checking API..." : "Check API Connection"}
      </button>

      {/* ✅ Result box */}
      <div style={{ marginTop: 14 }}>
        {apiStatus === "ok" && (
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(34,197,94,0.10)" }}>
            <div style={{ fontWeight: 700 }}>✅ API Connected</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
              Project: <b>{apiData?.project}</b>
              <br />
              Time: <b>{apiData?.time}</b>
            </div>
          </div>
        )}

        {apiStatus === "error" && (
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,0.12)" }}>
            <div style={{ fontWeight: 700 }}>❌ API Connection Failed</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
              {apiError}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Link to realtime messages demo */}
      <div style={{ marginTop: 24 }}>
        <Link
          to={demoChatId ? `/room-demo/${demoChatId}` : "/room-demo"}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(59,130,246,0.15)",
            fontWeight: 600,
          }}
        >
          Open realtime messages demo (room-1)
        </Link>
      </div>
    </div>
  );
}