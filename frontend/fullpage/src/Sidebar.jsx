import React from "react";
import "./App.css";

export default function Sidebar({ selected, onSelect }) {
  const features = ["Ask Nori", "Scholarship Finder", "CV Generator", "SOP Builder"];

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Features -----------</h3>
      {features.map((feature) => (
        <div
          key={feature}
          className={`sidebar-item ${selected === feature ? "active" : ""}`}
          onClick={() => onSelect(feature)}
        >
          {feature}
        </div>
      ))}
    </aside>
  );
}
