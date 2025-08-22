export async function askQuestion(question, sessionId, userId) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sessionId, userId }),
  });
  return res.json();
}

export async function sendFeedback(messageId, thumbsUp, thumbsDown) {
  await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, thumbsUp, thumbsDown }),
  });
}
