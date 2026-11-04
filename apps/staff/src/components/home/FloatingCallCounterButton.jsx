import React from "react";
import { Icon } from "framework7-react";

export default function FloatingCallCounterButton({ onClick }) {
  return (
    <div className="floating-call-counter" onClick={onClick}>
      <Icon f7="bell" className="call-counter-icon" />
    </div>
  );
}
