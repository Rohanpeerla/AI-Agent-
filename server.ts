import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Fetch real unread emails and calendar events from Google Workspace APIs (using user's Bearer token)
  app.post("/api/summarize", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let fetchedEmails: any[] = [];
      let fetchedEvents: any[] = [];
      let usingLiveSync = false;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        if (token && token !== "null" && token !== "undefined") {
          try {
            usingLiveSync = true;
            // 1. Fetch upcoming calendar events from Google Calendar API
            const nowIso = new Date().toISOString();
            const calUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
              nowIso
            )}&singleEvents=true&orderBy=startTime&maxResults=15`;

            const calRes = await fetch(calUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (calRes.status === 401) {
              return res.status(401).json({ error: "Google session expired. Please reconnect." });
            }

            if (calRes.ok) {
              const calData: any = await calRes.json();
              fetchedEvents = (calData.items || []).map((item: any) => ({
                id: item.id,
                summary: item.summary || "No Title",
                start: item.start?.dateTime || item.start?.date || "",
                end: item.end?.dateTime || item.end?.date || "",
                description: item.description || "",
                location: item.location || "",
              }));
            } else {
              console.error("Google Calendar API returned status:", calRes.status);
            }

            // 2. Fetch unread emails from Gmail API
            const gmailListUrl = "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread";
            const gmailListRes = await fetch(gmailListUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (gmailListRes.status === 401) {
              return res.status(401).json({ error: "Google session expired. Please reconnect." });
            }

            if (gmailListRes.ok) {
              const gmailListData: any = await gmailListRes.json();
              const messages = gmailListData.messages || [];

              for (const msg of messages) {
                const detailRes = await fetch(
                  `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (detailRes.ok) {
                  const detail: any = await detailRes.json();
                  const headers = detail.payload?.headers || [];
                  const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
                  const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
                  const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
                  const snippet = detail.snippet || "";

                  // Decode email body (text/plain preferred)
                  let body = "";
                  const parts = detail.payload?.parts;
                  if (parts) {
                    const plainTextPart = parts.find((p: any) => p.mimeType === "text/plain");
                    if (plainTextPart && plainTextPart.body?.data) {
                      body = Buffer.from(plainTextPart.body.data, "base64").toString("utf-8");
                    } else {
                      const htmlPart = parts.find((p: any) => p.mimeType === "text/html");
                      if (htmlPart && htmlPart.body?.data) {
                        body = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
                      } else {
                        body = snippet;
                      }
                    }
                  } else if (detail.payload?.body?.data) {
                    body = Buffer.from(detail.payload.body.data, "base64").toString("utf-8");
                  } else {
                    body = snippet;
                  }

                  fetchedEmails.push({
                    id: detail.id,
                    threadId: detail.threadId,
                    from,
                    subject,
                    date: dateHeader,
                    snippet,
                    body,
                  });
                }
              }
            } else {
              console.error("Gmail list API returned status:", gmailListRes.status);
            }
          } catch (apiErr) {
            console.error("Failed to query live Google APIs. Falling back.", apiErr);
            // Fall through to utilize request body mock/demo data
          }
        }
      }

      // If we didn't fetch any live data (not logged in or Google APIs returned nothing),
      // we fall back to either the data sent from client, or pre-seeded high-fidelity data.
      const clientEmails = req.body.emails || [];
      const clientEvents = req.body.events || [];

      const finalEmails = fetchedEmails.length > 0 ? fetchedEmails : clientEmails;
      const finalEvents = fetchedEvents.length > 0 ? fetchedEvents : clientEvents;

      // Ensure we have some data to summarize
      if (finalEmails.length === 0 && finalEvents.length === 0) {
        return res.json({
          usingLiveSync: false,
          briefing: {
            audioText: "Welcome back! There are currently no unread emails or upcoming calendar events to summarize. Your schedule is clear and your inbox is pristine.",
            executiveSummary: "*   **Status Clear**: No pending events or unread emails detected.\n*   **Perfect Day**: Take this opportunity to focus on strategic tasks.",
            timelineClashes: [],
            urgentActions: []
          },
          categorizedEmails: []
        });
      }

      // Call Gemini to post-process, write the narration brief, detect clashes, and categorize
      const ai = getGeminiClient();
      const summaryPrompt = `
You are an elite, executive chief of staff assistant. You are preparing a high-fidelity morning brief for the user.

Here is the data for today:
-- EMAILS (Unread) --
${JSON.stringify(finalEmails, null, 2)}

-- CALENDAR EVENTS --
${JSON.stringify(finalEvents, null, 2)}

Please perform the following operations:
1. Categorize each email into one of these strict classes: 'Urgent', 'Update', 'Schedule', 'Social', 'General'.
2. Detect any direct timeline conflicts between calendar events (e.g. meetings overlapping or happening at the exact same time).
3. Identify urgent action items with source emails or due dates.
4. Write a brilliant "Rise & Shine" morning audio briefing script. It must be professional, warm, executive-level, clear, and ready to read aloud. Do not include markdown tags inside the audioText - keep it as natural, flowing spoken English.

Format the output strictly as a JSON object matching this schema:
{
  "audioText": "Narrated chief-of-staff script welcoming the user and highlighting today's absolute crucial events, timeline clashes, and pending actions.",
  "executiveSummary": "A concise bulleted summary of the day using standard Markdown (use bullets *). Highlight crucial milestones.",
  "timelineClashes": [
    {
      "title": "Short title of conflict (e.g. Overlapping Ops Sync & Board Pre-brief)",
      "description": "Clear explanation of the clash details and recommended resolution.",
      "events": ["APAC Ops Strategy Sync", "Marcus / Rohan Pre-board Sync"]
    }
  ],
  "urgentActions": [
    {
      "title": "Short actionable task title",
      "description": "What needs to be done and why, referencing the email.",
      "sourceEmailId": "Gmail message ID",
      "dueDate": "Due date or time (if any)"
    }
  ],
  "categorizedEmails": [
    {
      "id": "Gmail message ID",
      "category": "One of: Urgent, Update, Schedule, Social, General"
    }
  ]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: summaryPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              audioText: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              timelineClashes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    events: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["title", "description", "events"],
                },
              },
              urgentActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    sourceEmailId: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                  },
                  required: ["title", "description"],
                },
              },
              categorizedEmails: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ["id", "category"],
                },
              },
            },
            required: ["audioText", "executiveSummary", "timelineClashes", "urgentActions", "categorizedEmails"],
          },
        },
      });

      const result = JSON.parse(response.text?.trim() || "{}");

      res.json({
        usingLiveSync,
        emails: finalEmails,
        events: finalEvents,
        briefing: {
          audioText: result.audioText,
          executiveSummary: result.executiveSummary,
          timelineClashes: result.timelineClashes,
          urgentActions: result.urgentActions,
        },
        categorizedEmails: result.categorizedEmails,
      });
    } catch (err: any) {
      console.error("Summarize Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate summary" });
    }
  });

  // Generate a high-fidelity custom draft reply
  app.post("/api/draft-reply", async (req, res) => {
    try {
      const { emailContent, tone, prompt } = req.body;
      if (!emailContent) {
        return res.status(400).json({ error: "emailContent is required" });
      }

      const ai = getGeminiClient();
      const draftPrompt = `
You are an elite executive assistant drafting a professional email response.
Subject Email Content:
"""
${emailContent}
"""

Instructions:
- Tone of reply: ${tone || "professional"}
- Additional user instruction: ${prompt || "None"}

Please write a highly polished, complete, ready-to-send draft reply. Preserve a highly professional structure: formal greetings, body paragraphs, and a polite sign-off.
Provide ONLY the text of the draft. Do not wrap it in additional conversational remarks.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: draftPrompt,
      });

      res.json({ draft: response.text?.trim() || "" });
    } catch (err: any) {
      console.error("Draft Reply Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate draft reply" });
    }
  });

  // Translate direct natural language voice/text commands into email parameters
  app.post("/api/parse-email-command", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) {
        return res.status(400).json({ error: "command is required" });
      }

      const ai = getGeminiClient();
      const parsePrompt = `
You are an executive assistant parsing conversational voice/text instructions from a busy executive and translating them into structured, high-fidelity email parameters.

Conversational command:
"${command}"

Extract or construct:
1. "to": Recipient email address or name mentioned. If they just say a name, return the name (e.g. "Sarah" or "Dave") or a plausible business email if possible (e.g., "sarah.jenkins@growth-tech.com" or "dave.vance@apex-corp.com").
2. "subject": A professional, high-fidelity, and contextually rich email subject line.
3. "body": A fully written, polite, and comprehensive professional email body translating the user's brief intent into polished executive messaging.

Format strictly as a JSON object matching this schema:
{
  "to": "Recipient email or name",
  "subject": "Formulated subject line",
  "body": "Complete drafted email body text"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: parsePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              to: { type: Type.STRING },
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
            },
            required: ["to", "subject", "body"],
          },
        },
      });

      const result = JSON.parse(response.text?.trim() || "{}");
      res.json({ draft: result });
    } catch (err: any) {
      console.error("Parse Command Error:", err);
      res.status(500).json({ error: err.message || "Failed to parse command" });
    }
  });

  // Real Email Sender via Gmail API
  app.post("/api/send-email", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized. Missing Google access token." });
      }
      const token = authHeader.substring(7);

      const { to, subject, body, threadId } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "to, subject, and body are required fields." });
      }

      // Format RFC 2822
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `To: ${to}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        body,
      ];
      const message = messageParts.join("\n");
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedMessage,
          ...(threadId ? { threadId } : {}),
        }),
      });

      if (sendRes.status === 401) {
        return res.status(401).json({ error: "Google session expired. Please reconnect." });
      }

      if (sendRes.ok) {
        const sendData = await sendRes.json();
        return res.json({ success: true, data: sendData });
      } else {
        const errText = await sendRes.text();
        return res.status(sendRes.status).json({ error: `Gmail API failed: ${errText}` });
      }
    } catch (err: any) {
      console.error("Send Email Error:", err);
      res.status(500).json({ error: err.message || "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
