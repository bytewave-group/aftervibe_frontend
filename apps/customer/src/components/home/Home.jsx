import React from "react";
import SendAnimationGiftButton from "./SendAnimationGiftButton";
import "../../css/Main.css";
// import "bootstrap/dist/css/bootstrap.min.css";

export default function Home() {
  return(
  <div className="container py-5">
    <div className="text-center">
      <div className="home-title my-4 mx-5">After Vibe</div>

      <div className="home-subtitle ">Welcome.</div>

      <SendAnimationGiftButton />
      {/* <SendAnimationFullScreenButton /> */}
    </div>
  </div>
  )
}