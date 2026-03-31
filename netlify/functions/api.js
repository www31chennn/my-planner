const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5WUcyCgC0ELH15FBjho-R1w5P5kopQOh0HqSGmksG3e4WrQyd_JL-YmQfbJVqMay2/exec";

exports.handler = async function(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const params = event.queryStringParameters || {};
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  try {
    const response = await fetch(`${SCRIPT_URL}?${qs}`);
    const text = await response.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
