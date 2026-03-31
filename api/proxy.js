// Vercel Serverless Function
// 放在 /api/proxy.js，前端呼叫 /api/proxy
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5WUcyCgC0ELH15FBjho-R1w5P5kopQOh0HqSGmksG3e4WrQyd_JL-YmQfbJVqMay2/exec";

export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 把 query string 轉發給 Google Apps Script
  const params = req.query || {};
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  try {
    const response = await fetch(`${SCRIPT_URL}?${qs}`);
    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(text);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
