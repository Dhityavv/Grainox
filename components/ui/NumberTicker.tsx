"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className = "",
  prefix = "",
  suffix = "",
  duration = 1.6,
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const obj = { val: prevValue.current };

    const tween = gsap.to(obj, {
      val: value,
      duration,
      delay,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayValue(Math.floor(obj.val));
      },
      onComplete: () => {
        prevValue.current = value;
        setDisplayValue(value);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, delay]);

  return (
    <span className={`inline-block tabular-nums font-mono ${className}`}>
      {prefix}
      {displayValue.toLocaleString("id-ID")}
      {suffix}
    </span>
  );
}
