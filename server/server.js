require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const modelName = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());

const demoUsers = new Map();
const demoContracts = new Map();
let nextContractId = 1;

function ensureUser(username) {
  if (!demoUsers.has(username)) {
    demoUsers.set(username, { id: username, username, balance: 500 });
  }
  return demoUsers.get(username);
}

function getTransferAmount(required, completed, stake) {
  const safeRequired = Math.max(1, Number(required) || 0);
  const safeCompleted = Math.max(0, Number(completed) || 0);
  const safeStake = Math.max(0, Number(stake) || 0);

  if (safeCompleted >= safeRequired) {
    return 0;
  }

  const missRatio = (safeRequired - safeCompleted) / safeRequired;
  return Number((safeStake * missRatio).toFixed(2));
}

async function generate(model, prompt) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text;
}

app.post("/api/setup", async (req, res) => {
  const { username, friendUsername, dailyGoalCount, stakeAmount } = req.body || {};

  if (!username || !friendUsername) {
    return res.status(400).json({ error: "username and friendUsername are required" });
  }

  const user = ensureUser(String(username).trim());
  const friend = ensureUser(String(friendUsername).trim());

  const contractId = `contract-${nextContractId++}`;
  const contract = {
    id: contractId,
    username: user.username,
    friendUsername: friend.username,
    dailyGoalCount: Math.max(1, Number(dailyGoalCount) || 1),
    stakeAmount: Math.max(0, Number(stakeAmount) || 100),
  };

  demoContracts.set(contractId, contract);

  return res.json({
    contractId,
    userId: user.id,
    friendId: friend.id,
    balances: {
      [user.username]: user.balance,
      [friend.username]: friend.balance,
    },
    friends: [friend.username],
  });
});

app.post("/api/evaluate", async (req, res) => {
  const { contractId, username, friendUsername, required, completed, stake } = req.body || {};

  if (!username || !friendUsername) {
    return res.status(400).json({ error: "username and friendUsername are required" });
  }

  const user = ensureUser(String(username).trim());
  const friend = ensureUser(String(friendUsername).trim());

  const contract = contractId && demoContracts.get(contractId);
  const requiredCount = Number(required ?? contract?.dailyGoalCount ?? 1);
  const completedCount = Number(completed ?? 0);
  const stakeValue = Number(stake ?? contract?.stakeAmount ?? 100);

  const transferAmount = getTransferAmount(requiredCount, completedCount, stakeValue);

  if (transferAmount > 0) {
    user.balance = Number((user.balance - transferAmount).toFixed(2));
    friend.balance = Number((friend.balance + transferAmount).toFixed(2));
  }

  const metGoal = completedCount >= requiredCount;

  return res.json({
    transferAmount,
    metGoal,
    message: metGoal
      ? `Great job. You completed ${completedCount}/${requiredCount}. No transfer applied.`
      : `You completed ${completedCount}/${requiredCount}. $${transferAmount.toFixed(2)} was transferred to @${friend.username}.`,
    balances: {
      [user.username]: user.balance,
      [friend.username]: friend.balance,
    },
  });
});

app.get("/api/nodes", async (req, res) => {
  const { data, error } = await supabase.from("nodes").select("*");
  if (error) return res.status(400).json(error);
  return res.json(data);
});

app.post("/api/nodes", async (req, res) => {
  const { data, error } = await supabase
    .from("nodes")
    .insert([{ text: req.body.text, status: "active", steps: [] }])
    .select();

  if (error) return res.status(400).json(error);
  return res.status(201).json(data[0]);
});

app.patch("/api/nodes/:id", async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status required" });

  const { data, error } = await supabase
    .from("nodes")
    .update({ status })
    .eq("id", req.params.id)
    .select();

  if (error) return res.status(400).json(error);
  return res.json(data[0] || {});
});

app.post("/api/similarity", async (req, res) => {
  const { ideas } = req.body;
  if (!ideas || !Array.isArray(ideas) || ideas.length < 2) {
    return res.json({ similarities: [] });
  }

  const prompt = `You are a productivity assistant. Given these goals/ideas, identify which pairs are meaningfully related (e.g., same domain, can be done together, one enables the other).\nGoals: ${JSON.stringify(ideas)}\n\nReturn ONLY a valid JSON array of objects. Each object: { "i": number, "j": number, "score": number }\nExample: [{"i":0,"j":1,"score":0.9},{"i":1,"j":2,"score":0.75}]`;

  try {
    const rawText = await generate(modelName, prompt);
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const similarities = JSON.parse(cleaned);
    return res.json({ similarities: Array.isArray(similarities) ? similarities : [] });
  } catch (e) {
    console.error("Similarity Error:", e);
    return res.json({ similarities: [] });
  }
});

app.post("/api/synthesize", async (req, res) => {
  const text = req.body?.text;

  if (text && typeof text === "string" && text.trim()) {
    const prompt = `Goal: ${text.trim()}.\nAs a productivity assistant, break this goal into 3 tiny, actionable starting steps.\nReturn ONLY a valid JSON array of 3 strings, no other text.\nExample: ["Step 1", "Step 2", "Step 3"]`;

    try {
      const rawText = await generate(modelName, prompt);
      const cleaned = rawText.replace(/```json|```/g, "").trim();

      let steps;
      try {
        steps = JSON.parse(cleaned);
      } catch (parseErr) {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          steps = JSON.parse(match[0]);
        } else {
          throw parseErr;
        }
      }

      const safeSteps = Array.isArray(steps)
        ? steps.slice(0, 3).map((s) => String(s))
        : [
            "Break it down and start with the first small action.",
            "Set a 5-minute timer.",
            "Celebrate when done.",
          ];

      return res.json({ steps: safeSteps });
    } catch (e) {
      console.error("Synthesize Error:", e?.message || e);
      return res.status(500).json({ steps: ["Could not synthesize steps."] });
    }
  }

  const { data: activeNodes, error } = await supabase
    .from("nodes")
    .select("*")
    .eq("status", "active");

  if (error) return res.status(400).json(error);

  for (const node of activeNodes) {
    if (!node.steps || node.steps.length === 0 || node.steps[0] === "Step 1: Open project") {
      const prompt = `Goal: ${node.text}.\nAs a productivity assistant, break this goal into 3 tiny, actionable starting steps.\nReturn the response ONLY as a valid JSON array of strings.\nExample: ["Step 1", "Step 2", "Step 3"]`;

      try {
        const rawText = await generate(modelName, prompt);
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        const aiSteps = JSON.parse(cleaned);
        await supabase.from("nodes").update({ steps: aiSteps }).eq("id", node.id);
      } catch (e) {
        console.error("Gemini Error:", e);
      }
    }
  }

  return res.json({ message: "Gemini synthesis complete." });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
