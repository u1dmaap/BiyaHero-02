import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ComparePage() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/map"); }, []);
  return null;
}
