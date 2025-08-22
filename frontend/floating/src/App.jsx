import React, { useEffect, useMemo, useRef, useState } from "react";
import { askQuestion } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import nori from "./nori.png";
import sendfast from "./sendfast.png";
import { FaMicrophone, FaThumbsUp, FaThumbsDown, FaLock } from "react-icons/fa";
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
  const [listening, setListening] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  const sessionId = useMemo(() => {
    return (
      localStorage.getItem("sessionId") ||
      (localStorage.setItem("sessionId", uid()), localStorage.getItem("sessionId"))
    );
  }, []);
  const userId = localStorage.getItem("userId") || null;

  const scrollerRef = useRef(null);
  const recognition = useRef(null);
  const finalTranscriptRef = useRef("");

  // Detect browser/mic support
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isBrave = !!navigator.brave;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || isBrave) {
      setMicSupported(false);
      return;
    }

    // Web Speech API setup (Desktop / Android Chrome / Safari)
    if ("webkitSpeechRecognition" in window && (!isIOS || isSafari)) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = "en-US";

      recognition.current.onstart = () => setListening(true);

      recognition.current.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcriptPiece + " ";
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const replaceMap = { inference: "Inforens" };
        const correctedFinal = finalTranscriptRef.current
          .split(" ")
          .map((word) => replaceMap[word.toLowerCase()] || word)
          .join(" ");
        const correctedInterim = interimTranscript
          .split(" ")
          .map((word) => replaceMap[word.toLowerCase()] || word)
          .join(" ");

        setInput(correctedFinal + correctedInterim);
      };

      recognition.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setListening(false);
      };

      recognition.current.onend = () => setListening(false);
    }
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo(0, scrollerRef.current.scrollHeight);
  }, [messages, loading]);

  async function onSend(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;

    setInput("");
    finalTranscriptRef.current = "";
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
        m.id === messageId ? { ...m, feedback: { thumbsUp: true, thumbsDown: false } } : m
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
        m.id === messageId ? { ...m, feedback: { thumbsUp: false, thumbsDown: true } } : m
      )
    );
  }

  // iOS MediaRecorder fallback
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      let chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        formData.append(
          "file",
          blob,
          "recording." + (mimeType === "audio/mp4" ? "mp4" : "webm")
        );

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          setInput(data.text || "");
        } catch (err) {
          console.error("Transcription failed:", err);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access failed:", err);
      alert("Cannot access microphone. Check browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  const handleMicClick = () => {
    if (!micSupported) {
      alert("Microphone not supported in this browser. Please use Safari/Chrome/Edge.");
      return;
    }

    if (recognition.current) {
      if (!listening) recognition.current.start();
      else recognition.current.stop();
    } else {
      if (!isRecording) startRecording();
      else stopRecording();
    }
  };

  // Example features for dropdown
  const features = [
    { name: "Ask Nori", icon: nori, locked: false },
    { name: "Scholarship Finder", icon: nori, locked: true },
  ];

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
          >
            <strong>Hey! I'm Nori</strong>
            <br />
            Ask me anything about studying abroad
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
            className="chat-window modern"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.3 }}
          >
            {messages.length === 0 && !featuresOpen && (
              <motion.div className="welcome-box modern" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p>
                  <strong>Hey there! ✨</strong>
                  <br />
                  Ask me anything about studying abroad!
                </p>
              </motion.div>
            )}

            <div className="chat-messages" ref={scrollerRef}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  className={m.role === "user" ? "user-msg modern" : "assistant-msg modern"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br/>") }} />
                  {m.role === "assistant" && (
                    <div className="feedback-icons">
                      <FaThumbsUp
                        className={`thumb-icon ${m.feedback?.thumbsUp ? "active" : ""}`}
                        onClick={() => handleThumbsUp(m.id)}
                        size={22}
                      />
                      <FaThumbsDown
                        className={`thumb-icon ${m.feedback?.thumbsDown ? "active" : ""}`}
                        onClick={() => handleThumbsDown(m.id)}
                        size={22}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && <div className="assistant-msg modern">Thinking…</div>}
            </div>

            {/* Input Area */}
            <form className="input-area" onSubmit={onSend}>
              <div className="input-row">
                <input
                  className="input-box modern"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question"
                  rows={1}
                />
                <button
                  type="button"
                  className={`mic-btn-modern ${listening || isRecording ? "listening" : ""}`}
                  onClick={handleMicClick}
                >
                  <FaMicrophone size={20} color={listening || isRecording ? "#FF5722" : "#aaa"} />
                </button>
                <button type="submit" className="send-btn-modern">
                  <img src={sendfast} alt="Send" />
                </button>
              </div>

              <FeaturesDropdown
                onSelectFeature={(feature) => setFeaturesOpen(false)}
                onDropdownOpen={() => setFeaturesOpen(true)}
                onDropdownClose={() => setFeaturesOpen(false)}
                style={{ width: "100%" }}
              >
                {features.map((feature) => (
                  <div className="feature-item" key={feature.name}>
                    <img src={feature.icon} alt={feature.name} />
                    <span>{feature.name}</span>
                    {feature.locked && (
                      <FaLock className="feature-lock-icon" />
                     
                        
    
                    )}
                  </div>
                ))}
              </FeaturesDropdown>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
