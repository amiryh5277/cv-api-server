
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Allow all origins for testing purposes
app.use(cors({ origin: "*" }));
app.use(express.json());

app.post("/api/analyze", async (req, res) => {
  const { resumeText, jobText } = req.body;

  if (!resumeText || !jobText) {
    return res.status(400).json({ error: "Missing resumeText or jobText" });
  }

  const prompt = `הנה קורות החיים שלי:
${resumeText}

והנה תיאור המשרה:
${jobText}

1. סרוק את שני הקבצים וזיהה מילות מפתח חשובות בתיאור המשרה.
2. ציין אילו מילות מפתח לא מופיעות בקו״ח שלי.
3. תן ציון התאמה כללי (באחוזים) בין קורות החיים למשרה.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI Error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    res.json({ result: data.choices[0].message.content });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
