const API_URL = "http://localhost:3000";

export async function analyzeText(text) {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  return await res.json();
}