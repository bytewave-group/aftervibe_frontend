import React, { useState, useEffect, useRef } from "react";
import ScrollContainer from "react-indiana-drag-scroll";

export default function AnimatedScrollableRow({
  innerRef,
  children,
  animate = false,
  animateQueue = [], //? { type: 'scrollRight'|'scrollLeft'|'pause', duration: number, speed?: number }
}) {
  const [isScrolling, setIsScrolling] = useState(false);
  const isContainerMouseDownRef = useRef(false);
  const currentTaskIndexRef = useRef(null);
  const taskStartTimeRef = useRef(null);
  const animationInterval = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const container = innerRef?.current;
    if (!container || !animate) return;

    animationInterval.current = startAnimate();

    return () => stopAnimate();
  }, [animate]);

  const nextAnimation = () => {
    currentTaskIndexRef.current =
      (currentTaskIndexRef.current + 1) % animateQueue.length;
    taskStartTimeRef.current = null;
  };

  const animateFunction = (timestamp) => {
    const container = innerRef?.current;
    if (!container) return;

    const contentWidth = container.scrollWidth;
    const containerWidth = container.clientWidth;
    const maxTranslate = contentWidth - containerWidth;

    if (!taskStartTimeRef.current) {
      taskStartTimeRef.current = timestamp;
    }
    if (currentTaskIndexRef.current === null) {
      currentTaskIndexRef.current = 0;
    }

    const task = animateQueue[currentTaskIndexRef.current];
    const elapsed = timestamp - taskStartTimeRef.current;

    if (task.type === "scrollRight") {
      container.scrollLeft += task.speed;
      if (elapsed >= task.duration || container.scrollLeft >= maxTranslate) {
        container.scrollLeft = Math.min(container.scrollLeft, maxTranslate);
        nextAnimation();
      }
    } else if (task.type === "scrollLeft") {
      container.scrollLeft -= task.speed;
      if (elapsed >= task.duration || container.scrollLeft <= 0) {
        container.scrollLeft = Math.max(container.scrollLeft, 0);
        nextAnimation();
      }
    } else if (task.type === "pause") {
      if (elapsed >= task.duration) {
        nextAnimation();
      }
    }

    animationInterval.current = requestAnimationFrame(animateFunction);
  };

  const startAnimate = () => {
    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true;
      return requestAnimationFrame(animateFunction);
    }
  };

  const stopAnimate = () => {
    isAnimatingRef.current = null;
    return cancelAnimationFrame(animationInterval.current);
  };

  const holdStartTimerRef = useRef(null);

  const handleMouseDown = async (mouseEvent, container) => {
    isContainerMouseDownRef.current = true;

    holdStartTimerRef.current = setTimeout(() => {
      setIsScrolling(true);
      stopAnimate();
    }, 500);
  };

  const handleMouseUp = async () => {
    if (holdStartTimerRef.current) {
      clearTimeout(holdStartTimerRef.current);
      holdStartTimerRef.current = null;
    }
    if (isContainerMouseDownRef.current) {
      isContainerMouseDownRef.current = false;
      animationInterval.current = startAnimate();
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 50);
      });
      setIsScrolling(false);
    }
  };

  useEffect(() => {
    const container = innerRef?.current;
    if (!container) return;

    const onMouseDown = (e) => handleMouseDown(e, container);
    const onMouseUp = (e) => handleMouseUp(e);

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      if (container) {
        container.removeEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
      }
    };
  }, []);

  return (
    <ScrollContainer innerRef={innerRef} className="w-100 overflow-hidden">
      <div
        style={{
          pointerEvents: isScrolling ? "none" : "auto",
        }}
      >
        {children}
      </div>
    </ScrollContainer>
  );
}
