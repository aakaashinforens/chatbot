export async function askQuestion(question, sessionId, userId) {
const res = await fetch('/api/ask', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ question, sessionId, userId })
})
const data = await res.json()
if (!res.ok) throw new Error(data.error || 'Request failed')
return data
}