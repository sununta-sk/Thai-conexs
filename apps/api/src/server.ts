import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    project: "DowndaRoad Media",
    time: new Date().toISOString(),
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email & password required" });
  }
  return res.json({
    ok: true,
    token: "demo-token-123",
    user: { email },
  });
});

app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
});