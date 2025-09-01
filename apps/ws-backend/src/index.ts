import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import RoomManager from './RoomManager';

const wss = new WebSocketServer({port: 1234});

wss.on("connection", (ws, req) => {
  const token = req.url?.split('token=')[1];
  
  if(!token){
    ws.close(1008, 'Authentication Token Required');
    return;
  }

  if(!process.env.JWT_SECRET){
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if(error){
      ws.close(1008, 'Invalid JWT Token');
      return;
    }
  });

  ws.on('message', () => {

  });

});