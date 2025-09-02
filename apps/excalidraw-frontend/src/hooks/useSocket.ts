import { useState, useEffect, useRef } from "react";
import { useAppSelector } from "@/lib/hooks";

export function useSocket(){
  const [loading, setLoading] = useState<boolean>(true);
  const socketRef = useRef<WebSocket | null>(null);

  const { profile } = useAppSelector(state => state.user);

  useEffect(() => {
    if(!process.env.NEXT_PUBLIC_WS_URL){
      throw new Error(`WebSocket URL is not defined in environment variables.`)
    }

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/token=${localStorage.getItem('token')}`);

    ws.onopen = () => {
      socketRef.current = ws;
      setLoading(false);
    }

    ws.onclose = () => {
      socketRef.current = null;
    }

  },[profile]);

  return {
    socket: socketRef.current,
    loading
  }
}