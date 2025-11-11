'use client'
import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { useSocket } from "@/hooks/useSocket";
import Canvas from '@/components/Canvas'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import axios from 'axios';
import { addRemoteShape, modifyShape, deleteShapes, startCollaborating } from "@/lib/features/board/boardSlice";
import { setUserProfile } from "@/lib/features/user/userSlice";

interface IResponse {
  id: number,
  shapeId: string
  properties: string,
  userId: number,
  roomId: number,
} 

export function Room({roomId}: {
  roomId: string
}){
  
  const dispatch = useAppDispatch();
  const initializeRef = useRef(false);

  const { socket, loading } = useSocket();
  const { profile } = useAppSelector(state => state.user);

  useEffect(() => {
    dispatch(startCollaborating());
  },[dispatch]);
  
  useEffect(() => {
    if(!profile){
      return;
    }

    if(!initializeRef.current){
      initializeRef.current = true;

      axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/room/join/${roomId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }).then(response => {
        const shapes: IResponse[] = response.data.data.shapes;
        shapes.forEach(shape => {
          const parsedData = JSON.parse(shape.properties);
          dispatch(addRemoteShape(parsedData));
        });
      }).catch((error) => {
        console.log(error);
        if(error.response.status === 400 || error.response.status === 403){
          localStorage.removeItem('token');
          dispatch(setUserProfile(null));
        }
      });
    }

  },[dispatch, roomId, profile]);

  useEffect(() => {
    if(socket && !loading){
      socket.send(JSON.stringify({
        type: 'join-room',
        payload: {
          roomId: roomId
        }
      }));

      socket.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);  
        if(parsedData.type === 'add-shape'){
          dispatch(addRemoteShape(parsedData.payload.shape));
        }  
        else if(parsedData.type === 'modify-shape'){
          dispatch(modifyShape(parsedData.payload.shape));
        }  
        else if(parsedData.type === 'delete-shape'){
          dispatch(deleteShapes([parsedData.payload.shapeId]));
        }  
      }
    }
  },[dispatch, roomId, socket, loading, profile]);

  return(
    <main>
      <Navbar />
      {
        !loading &&
        <Canvas socket={socket} roomId={roomId} />
      }
      <Footer />
    </main>
  )
}