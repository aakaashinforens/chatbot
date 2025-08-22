import React from "react";
import frame from "./frame.png";
import "./App.css";

export default function Header() {
  return (
    <header className="header">
      <img src={frame} alt="Header Frame" className="header-frame" />
      <nav className="header-nav">
        <span>About Us</span>
        <span>Contact</span>
        <span>Help</span>
      </nav>
    </header>
  );
}
