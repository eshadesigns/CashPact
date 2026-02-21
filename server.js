require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use(cors());
app.use(express.json());

// 1. GET goals from Supabase
app.get('/api/nodes', async (req, res) => {
    const { data, error } = await supabase.from('nodes').select('*');
    if (error) return res.status(400).json(error);
    res.json(data);
});

// 2. ADD a new goal to Supabase
app.post('/api/nodes', async (req, res) => {
    const { data, error } = await supabase
        .from('nodes')
        .insert([{ text: req.body.text, status: 'active', steps: [] }])
        .select();
    
    if (error) return res.status(400).json(error);
    res.status(201).json(data[0]);
});

// 3. THE MAGIC: Synthesize (Real AI Steps from Gemini)
app.post('/api/synthesize', async (req, res) => {
    // 1. Fetch active nodes from Supabase
    const { data: activeNodes, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('status', 'active');

    if (error) return res.status(400).json(error);

    // 2. Loop through each goal and ask Gemini for REAL steps
    for (const node of activeNodes) {
        // Only synthesize if it has no steps OR the old fake ones
        if (!node.steps || node.steps.length === 0 || node.steps[0] === "Step 1: Open project") {
            
            const prompt = `Goal: ${node.text}. 
            As a productivity assistant, break this goal into 3 tiny, actionable starting steps. 
            Return the response ONLY as a valid JSON array of strings. 
            Example: ["Step 1", "Step 2", "Step 3"]`;

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Clean the AI text and parse it into an array
                const cleanedText = text.replace(/```json|```/g, "").trim();
                const aiSteps = JSON.parse(cleanedText);

                // 3. Save the REAL AI steps back to Supabase
                await supabase.from('nodes').update({ steps: aiSteps }).eq('id', node.id);
                console.log(`✨ Gemini synthesized steps for: ${node.text}`);
            } catch (e) {
                console.error("Gemini Error:", e);
            }
        }
    }
    res.json({ message: "Gemini Synthesis complete!" });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running with Supabase on port ${PORT}`);
});