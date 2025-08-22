import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import "./App.css";

export default function App() {
  const [selectedFeature, setSelectedFeature] = useState("Ask Nori");

  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <Sidebar selected={selectedFeature} onSelect={setSelectedFeature} />
        <div className="chat-container">
          {selectedFeature === "Ask Nori" && <ChatWindow />}
          {/* You can add other feature pages later */}
        </div>
      </div>
    </div>
  );
}
