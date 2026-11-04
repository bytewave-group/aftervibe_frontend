import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { show_toast } from "@my-common-tool/tool/toast";
import ChatWidgetNewState from "./ChatWidgetNewState";
import { playNotificationSound, processChatMessage } from "./function";
import { GLOBAL_CONTAINER_ID } from "./config";

export default function useChatroomMessage() {
  const setChatWidgetState = useSetRecoilState(ChatWidgetNewState);

  const seenMessageIdsRef = useRef(new Set());
  const lastMessageTimeRef = useRef(0);

  const audioCtxRef = useRef(null);
  const lastPlayRef = useRef(0);

  const schedulePlayNotificationSound = async () => {
    try {
      const now = Date.now();
      if (now - lastPlayRef.current < 200) return;
      lastPlayRef.current = now;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }

      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      playNotificationSound(audioCtxRef.current);
    } catch (err) {
      show_toast("playNotificationSound error");
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.data;
      const { shouldIgnore, now, msgId } = processChatMessage({
        data,
        seenMessageIds: seenMessageIdsRef.current,
        lastMessageTime: lastMessageTimeRef.current,
      });

      if (shouldIgnore) return;

      if (msgId) {
        seenMessageIdsRef.current.add(msgId);
        if (seenMessageIdsRef.current.size > 200) {
          const arr = [...seenMessageIdsRef.current];
          seenMessageIdsRef.current = new Set(arr.slice(-100));
        }
      } else {
        lastMessageTimeRef.current = now;
      }

      setChatWidgetState((prev) => ({
        ...prev,
        unreadCount: (prev.unreadCount || 0) + 1,
      }));
      schedulePlayNotificationSound();
    };
    window.addEventListener("message", handleMessage);
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current?.close?.();
        audioCtxRef.current = null;
      }
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  //? when focus , set is read
  useEffect(() => {
    const handleFocusIn = (e) => {
      if (!e.target.matches("input, textarea")) return;
      const container = document.getElementById(GLOBAL_CONTAINER_ID);
      if (!container || !container.contains(e.target)) return;
      setChatWidgetState((prev) => ({ ...prev, unreadCount: 0 }));
    };
    document.addEventListener("focusin", handleFocusIn, true);
    return () => document.removeEventListener("focusin", handleFocusIn, true);
  }, []);

  return null;
}
