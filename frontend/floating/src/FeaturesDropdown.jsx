import React, { useState, useEffect, useRef } from "react";
import editIcon from "./edit.png";
import scholarshipIcon from "./Scholarship.png";
import docIcon from "./doc.png";
import notesIcon from "./notes.png";
import crossIcon from "./cross.png";
import "./App.css";

export default function FeaturesDropdown({ onSelectFeature }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const features = [
    {
      title: "Ask Nori",
      subtitle: "Ask me anything related to study abroad",
      icon: editIcon,
      locked: false,
    },
    {
      title: "Scholarship Finder",
      subtitle: "Find the best scholarships for you",
      icon: scholarshipIcon,
      locked: true,
    },
    {
      title: "CV Generator",
      subtitle: "Create an ATS Friendly CV",
      icon: docIcon,
      locked: true,
    },
    {
      title: "SOP Builder",
      subtitle: "Get a personalised SOP",
      icon: notesIcon,
      locked: true,
    },
  ];

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelRef]);

  return (
    <div className="features-dropdown-container">
      <div
        className="features-dropdown"
        onClick={() => setOpen(!open)}
      >
        <span className="features-text">Features</span>
        <img src="/Vector.png" alt="dropdown" className="features-arrow" />
      </div>

      {open && (
        <div className="features-panel" ref={panelRef}>
          {/* Close button */}
          <img
            src={crossIcon}
            alt="Close"
            className="features-close-btn"
            onClick={() => setOpen(false)}
          />

          {features.map((f, idx) => (
            <div
              key={idx}
              className={`feature-card ${f.locked ? "locked" : ""} ${
                idx === 0 ? "highlighted" : ""
              }`}
              onClick={() => !f.locked && onSelectFeature(f.title)}
            >
              <img src={f.icon} alt="" className="feature-icon" />
              <div className="feature-text">
                <div className="feature-title">{f.title}</div>
                <div className="feature-subtitle">{f.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
