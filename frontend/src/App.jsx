import React, { useEffect, useMemo, useRef, useState } from "react";
import { askQuestion } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import nori from "./nori.png";
import sendfast from "./sendfast.png";
import thumbsup from "./thumbsup.png";
import thumbsdown from "./thumbsdown.png";
import FeaturesDropdown from "./FeaturesDropdown";
import "./App.css";

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");

  const [micOpen, setMicOpen] = useState(false);
  const recognitionRef = useRef(null);

  const sessionId = useMemo(() => {
    return (
      localStorage.getItem("sessionId") ||
      (localStorage.setItem("sessionId", uid()), localStorage.getItem("sessionId"))
    );
  }, []);

  const userId = localStorage.getItem("userId") || null;
  const scrollerRef = useRef(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo(0, scrollerRef.current.scrollHeight);
  }, [messages, loading]);

  // Initialize speech recognition
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.warn("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onend = () => {
      setMicOpen(false);
    };

    recognitionRef.current = recognition;
  }, []);

  function startListening() {
    if (recognitionRef.current) recognitionRef.current.start();
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
  }

  async function onSend(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;

    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: q }]);
    setLoading(true);

    try {
      const { answer, messageId } = await askQuestion(q, sessionId, userId);
      setMessages((prev) => [
        ...prev,
        { id: messageId, role: "assistant", content: answer, feedback: {} },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "Sorry, something went wrong." },
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleThumbsUp(messageId) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback: { thumbsUp: true, thumbsDown: false } }
          : m
      )
    );
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, thumbsUp: true, thumbsDown: false, feedback: "" }),
    });
  }

  function handleThumbsDown(messageId) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback: { thumbsUp: false, thumbsDown: true } }
          : m
      )
    );
    setFeedbackMessageId(messageId);
    setFeedbackText("");
  }

  async function submitFeedback() {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: feedbackMessageId,
        thumbsUp: false,
        thumbsDown: true,
        feedback: feedbackText,
      }),
    });
    setFeedbackMessageId(null);
  }

  return (
    <div>
      {/* Floating Nori + Bubble */}
      <div className="nori-container">
        {!open && (
          <motion.div
            className="nori-bubble"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            onClick={() => setOpen(true)}
            style={{ cursor: "pointer" }}
          >
            Hi, I'm Nori, your personal AI assistant. Ask me something about studying abroad.
          </motion.div>
        )}
        <motion.img
          src={nori}
          alt="Nori"
          className="nori-icon"
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.9 }}
        />
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="chat-window"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Welcome Box */}
            {messages.length === 0 && (
              <div className="welcome-box">
                <p className="welcome-text">
                  Hey there! I’m Norry.<br />
                  <strong>Got questions? I’ve got answers.</strong><br />
                  Ask me anything about studying abroad!
                </p>
              </div>
            )}

            <div className="chat-messages" ref={scrollerRef}>
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "user-msg" : "assistant-msg"}>
                  <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br/>") }} />
                  {m.role === "assistant" && (
                    <div className="feedback-icons">
                      <img
                        src={thumbsup}
                        alt="thumbs up"
                        className={`thumb-icon ${m.feedback?.thumbsUp ? "active" : ""}`}
                        onClick={() => handleThumbsUp(m.id)}
                      />
                      <img
                        src={thumbsdown}
                        alt="thumbs down"
                        className={`thumb-icon ${m.feedback?.thumbsDown ? "active" : ""}`}
                        onClick={() => handleThumbsDown(m.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {loading && <div className="assistant-msg">Thinking…</div>}
            </div>

            {/* Feedback Popup */}
            {feedbackMessageId && (
              <div className="feedback-popup">
                <p>How can we improve?</p>
                <textarea
                  className="feedback-textarea"
                  placeholder="Type your feedback..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                <div className="feedback-popup-buttons">
                  <button onClick={submitFeedback}>Submit</button>
                  <button onClick={() => setFeedbackMessageId(null)}>Close</button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <form className="input-area" onSubmit={onSend} style={{ position: "relative" }}>
              <div className="input-row" style={{ display: "flex", alignItems: "center" }}>
                <input
                  className="input-box"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question"
                  style={{ flex: 1 }}
                />

                {/* Microphone button */}
                <button
                  type="button"
                  className="mic-btn"
                  onClick={() => {
                    setMicOpen(true);
                    startListening();
                  }}
                  title="Speak"
                  style={{ marginLeft: "6px" }}
                >
                  🎤
                </button>

                {/* Send button */}
                <button type="submit" className="send-btn" style={{ marginLeft: "6px" }}>
                  <img src={sendfast} alt="Send" />
                </button>
              </div>

              {/* Microphone Popup */}
              {micOpen && (
                <div className="mic-popup">
                  <p>Listening...</p>
                  <button className="mic-popup-btn" onClick={stopListening}>
                    🎤
                  </button>
                  <button
                    style={{ marginLeft: "10px", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                    onClick={() => setMicOpen(false)}
                  >
                    Close
                  </button>
                </div>
              )}

              <FeaturesDropdown onSelectFeature={(feature) => console.log(feature)} />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
