import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ატვირთული .eml file-ის ანალიზი 
app.post("/api/analyze/eml", upload.single("emlFile"), async (req, res) => {
  const { userEmail } = req.body;

  if (!req.file || !userEmail) {
    return res.status(400).json({ error: "emlFile and userEmail are required" });
  }

  try {
    const base64Contents = req.file.buffer.toString("base64");

    const tinesResponse = await axios.post(
      process.env.TINES_WEBHOOK,
      { eml_file: { contents: base64Contents }, results_email: userEmail },
      {
        headers: { "Content-Type": "application/json" },
       

        validateStatus: () => true,
      }
    );

    console.log("Tines status:", tinesResponse.status);
    console.log("Tines body:", tinesResponse.data);

    // Tines webhook გვპასუხობს "Ok" როცა წარმატებულად ჩაივლის 
    res.json({
      status: "submitted",
      message: `Analysis started. Results will be sent to ${userEmail}.`,
    });

  } catch (err) {
    console.error("Network/config error:", err.message);
    res.status(500).json({ error: "Could not reach Tines. Is the server running and TINES_WEBHOOK correct?" });
  }
});

//  ანალიზი მოცემული იმეილის ტექსტის
app.post("/api/analyze/text", async (req, res) => {
  const { emailText, userEmail } = req.body;

  if (!emailText || !userEmail) {
    return res.status(400).json({ error: "emailText and userEmail are required" });
  }

  try {
    const syntheticEml = [
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      `Date: ${new Date().toUTCString()}`,
      "Subject: (Pasted email analysis)",
      "",
      emailText,
    ].join("\r\n");

    const base64Contents = Buffer.from(syntheticEml).toString("base64");

    const tinesResponse = await axios.post(
      process.env.TINES_WEBHOOK,
      { eml_file: { contents: base64Contents }, results_email: userEmail },
      {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      }
    );

    console.log("Tines status:", tinesResponse.status);
    console.log("Tines body:", tinesResponse.data);

    res.json({
      status: "submitted",
      message: `Analysis started. Results will be sent to ${userEmail}.`,
    });

  } catch (err) {
    console.error("Network/config error:", err.message);
    res.status(500).json({ error: "Could not reach Tines. Is the server running and TINES_WEBHOOK correct?" });
  }
});

// Health check 
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", webhook: process.env.TINES_WEBHOOK ? "configured" : "MISSING" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Phishing analyzer backend running on port ${PORT}`);
  console.log(`   Webhook: ${process.env.TINES_WEBHOOK || "⚠️  NOT SET"}`);
});