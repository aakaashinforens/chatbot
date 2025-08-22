import React, { useState, useRef, useEffect, useMemo } from "react";
import { askQuestion, sendFeedback } from "./api";
import { FaThumbsUp, FaThumbsDown, FaMicrophone } from "react-icons/fa";
import "./App.css";

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollerRef = useRef(null);

  const sessionId = useMemo(() => {
    return localStorage.getItem("sessionId") || (localStorage.setItem("sessionId", uid()), localStorage.getItem("sessionId"));
  }, []);
  const userId = localStorage.getItem("userId") || null;

  useEffect(() => {
    scrollerRef.current?.scrollTo(0, scrollerRef.current.scrollHeight);
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: question }]);
    setLoading(true);

    try {
      const { answer, messageId } = await askQuestion(question, sessionId, userId);
      setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: answer, feedback: {} }]);
    } catch {
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  const handleThumbsUp = async (id) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, feedback: { thumbsUp: true, thumbsDown: false } } : m));
    await sendFeedback(id, true, false);
  };

  const handleThumbsDown = async (id) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, feedback: { thumbsUp: false, thumbsDown: true } } : m));
    await sendFeedback(id, false, true);
  };

  return (
    <div className="chat-window-fullpage">
      <div className="chat-messages" ref={scrollerRef}>
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "user-msg" : "assistant-msg"}>
            <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br/>") }} />
            {m.role === "assistant" && (
              <div className="feedback-icons">
                <FaThumbsUp className={`thumb-icon ${m.feedback?.thumbsUp ? "active" : ""}`} onClick={() => handleThumbsUp(m.id)} />
                <FaThumbsDown className={`thumb-icon ${m.feedback?.thumbsDown ? "active" : ""}`} onClick={() => handleThumbsDown(m.id)} />
              </div>
            )}
          </div>
        ))}
        {loading && <div className="assistant-msg">Thinking…</div>}
      </div>

      <form className="input-area" onSubmit={handleSend}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." />
        <button type="submit">Send</button>
        <button type="button"><FaMicrophone /></button>
      </form>
    </div>
  );
}
