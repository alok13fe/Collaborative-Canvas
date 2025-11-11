import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/hooks";

export function useSocket(){
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { profile } = useAppSelector(state => state.user);

  useEffect(() => {
    if(!process.env.NEXT_PUBLIC_WS_URL){
      throw new Error(`WebSocket URL is not defined in environment variables.`)
    }

    if(!localStorage.getItem('token')){
      setLoading(false);
      if(socket){
        socket.close();
        setSocket(null);
      }
      return;
    }

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?token=${localStorage.getItem('token')}`);

    ws.onopen = () => {
      setSocket(ws);
      setLoading(false);
    }

    ws.onclose = () => {
      setSocket(null);
      setLoading(false);
    }

    ws.onerror = (err) => {
      console.log("WebSocket error:", err);
      setLoading(false);
    }

    return () => {
      if(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSED){
        ws.close();
      }
      setSocket(null);
    }
  },[profile]);

  return {
    socket,
    loading
  }
}