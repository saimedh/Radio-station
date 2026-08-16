"use client";

import { useEffect, useState } from "react";

export default function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const update = () => setTime(formatter.format(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!time) return <span aria-hidden="true">--:-- --</span>;
  const [clock, period] = time.split(" ");
  const [hour, minute] = clock.split(":");
  return <span><span>{hour}</span><span className="clock-colon">:</span><span>{minute}</span>{period ? <span className="ml-1">{period}</span> : null}</span>;
}
