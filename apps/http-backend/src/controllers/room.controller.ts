import { Request, Response } from "express";
import { prismaClient } from "@repo/db/client";
import { nanoid } from 'nanoid';

export async function createRoom(req: Request, res: Response) {
  try {
    let roomId = nanoid(10);
    let roomIdExists = await prismaClient.room.findFirst({
      where: {
        slug: roomId
      }
    });
    
    while(roomIdExists){
      roomId = nanoid(10);

      roomIdExists = await prismaClient.room.findFirst({
      where: {
        slug: roomId
      }
    });
    }

    const room = await prismaClient.room.create({
      data: {
        slug: roomId,
        admin: {
          connect: {
            id: req.userId
          }
        }
      }
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        roomId: room.slug
      },
      message: 'Room created successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't create room.",
      error
    });
  }
}