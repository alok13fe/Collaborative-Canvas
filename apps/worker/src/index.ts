import dotenv from "dotenv";
dotenv.config();

import { createClient } from "redis";
import axios from "axios";

const client = createClient({
  url: process.env.REDIS_URL
});

async function main(){
  await client.connect();

  const queues = ['add-shape', 'modify-shape', 'delete-shape'];
  
  while(true){
    const result = await client.brPop(queues, 0);

    if(!result){
      continue;
    }

    const {key: queueName, element: data} = result;

    if(typeof(data) !== 'string'){
      return;
    }
    
    try {
      const parsedData = JSON.parse(data);

      if(queueName === 'add-shape'){
        const {roomId, shape, token} = parsedData;
        
        await axios.post(
          `${process.env.BACKEND_URL}/room/add-shape`,
          {
            roomId,
            shapeId: shape.id,
            properties: shape
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        console.log(`Shape: ${shape.id} add to Room: ${roomId}`);
      }
      else if(queueName === 'modify-shape'){
        const {roomId, shape, token} = parsedData;
        
        await axios.put(
          `${process.env.BACKEND_URL}/room/modify-shape`,
          {
            roomId,
            shapeId: shape.id,
            properties: shape
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        console.log(`Shape: ${shape.id} updated to Room: ${roomId}`);
      }
      else if(queueName === 'delete-shape'){
        const {roomId, shapeId, token} = parsedData;
        
        await axios.delete(
          `${process.env.BACKEND_URL}/room/delete-shape?roomId=${roomId}&shapeId=${shapeId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        console.log(`Shape: ${shapeId} deleted from Room: ${roomId}`);
      }
    } catch (error) {
      console.log(error);
    }
  }
}

main();