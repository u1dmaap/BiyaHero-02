import { useEffect } from "react";
import { useLocation } from "wouter";

export default function BookPage(_props: { scheduleId: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/map"); }, []);
  return null;
}
