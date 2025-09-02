import dotenv from 'dotenv';
dotenv.config();

import { WebSocketServer, WebSocket } from 'ws';
import { prismaClient } from '@repo/db/client';
import jwt from 'jsonwebtoken';
import { shapeSchema } from '@repo/common/schema';

const rooms: Record<string, Set<WebSocket>> = {};

const wss = new WebSocketServer({port: 1234});

function authenticateUser(token: string): number | null {
  try {
    if(!process.env.JWT_SECRET){
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }
  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
    if(typeof decoded === 'string'){
      return null;
    }
  
    if(!decoded || !decoded.id){
      return null;
    }
  
    return decoded.id;
  } catch (error) {
    return null;
  }
}

function broadcastMessage(roomId: string, message: object, excludeClient?: WebSocket): void{
  if(rooms[roomId]){
    rooms[roomId].forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
        client.send(JSON.stringify(message));
      }
    })
  }
}

wss.on("connection", function connection(ws, req){
  const token = req.url?.split('token=')[1];

  if(!token){
    ws.close(1008, 'Authentication Token Required');
    return;
  }
  
  const userId = authenticateUser(token);

  if(!userId){
    ws.close(1008, 'Invalid ');
    return;
  }
  
  ws.on('message', async (data, isBinary) => {  
    const message = isBinary ? data : data.toString();
    if(typeof message !== 'string'){
      return;
    }
    
    let parsedData, type, payload;
    try {
      parsedData = JSON.parse(message);
      type = parsedData.type;
      payload = parsedData.payload;
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: {
          message: 'Invalid Message Format'
        }
      })); 
    }

    if(type === 'join-room'){
      try {
        const { roomId } = payload;
        
        if(!roomId || typeof(roomId) !== 'string'){
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: 'Room Id is required.'
            }
          }));
          return;
        }
        
        /* Check if Room Exists */
        const roomExists = await prismaClient.room.findFirst({
          where: {
            slug: roomId
          }
        });

        if(!roomExists){
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: 'Room Id is required.'
            }
          }));
          return;
        }

        if(!rooms[roomId]){
          rooms[roomId] = new Set<WebSocket>();
        }

        if(!rooms[roomId].has(ws)){
          rooms[roomId].add(ws);
        }

        const joinNotification = {
          type: 'user-joined',
          payload: {
            userId,
            message: 'new user joined room'
          }
        }
        broadcastMessage(roomId, joinNotification);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
    else if(type === 'add-shape'){
      try {
        const { roomId, shape } = payload;

        /* Input Validation */
        shapeSchema.parse(shape);

        broadcastMessage(roomId, parsedData, ws);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
    else if(type === 'modify-shape'){
      try {
        const { roomId, shape } = payload;

        /* Input Validation */
        shapeSchema.parse(shape);

        broadcastMessage(roomId, parsedData, ws);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
    else if(type === 'delete-shape'){
      try {
        const { roomId, shapeId } = payload;


        broadcastMessage(roomId, parsedData, ws);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
    else if(type === 'leave-room'){
      try {
        const { roomId } = payload;
  
        if(!roomId || typeof(roomId) !== 'string'){
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: 'Room Id is required.'
            }
          }));
          return;
        }
  
        if(rooms[roomId] && rooms[roomId].has(ws)){
          rooms[roomId].delete(ws);
  
          if (rooms[roomId].size === 0) {
            delete rooms[roomId];
          }
        }
  
        const leaveNotification = {
          type: 'user-left',
          payload: {
            userId,
            message: 'user left the room'
          }
        }
        if(rooms[roomId]){
          broadcastMessage(roomId, leaveNotification);
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
  });

  ws.on('close', () => {

  });

});