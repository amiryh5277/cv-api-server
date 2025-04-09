const express = require("express");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/analyze", upload.single("cvFile"), async (req, res) => {
  const jobText = req.body.jobText;
  const file = req.file;

  if (!file || !jobText) {
    return res.status(400).json({ error: "Missing file or job description." });
  }

  try {
    let resumeText = "";

    if (file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(file.path);
      const parsed = await pdfParse(dataBuffer);
      resumeText = parsed.text;
    } else if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/msword"
    ) {
      const data = fs.readFileSync(file.path);
      const result = await mammoth.extractRawText({ buffer: data });
      resumeText = result.value;
    } else {
      return res.status(400).json({ error: "Unsupported file type." });
    }

    const prompt = `נתח את קורות החיים הבאים:
${resumeText}

מול תיאור המשרה הבא:
${jobText}

החזר אחוז התאמה, מילות מפתח חסרות, וניתוח טקסטואלי בעברית.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});