import { Request, Response } from "express";
import { prismaClient } from "@repo/db/client";
import { nanoid } from 'nanoid';
import { addShapeSchema, deleteShapeSchema } from "@repo/common/schema";
import { z } from "zod";

export async function createRoom(req: Request, res: Response) {
  try {
    let roomId, roomIdExists;
    
    do{
      roomId = nanoid(10);

      roomIdExists = await prismaClient.room.findFirst({
        where: {
          slug: roomId
        }
      });
    } while(roomIdExists);

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
        admin: room.adminId,
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

export async function joinRoom(req: Request, res: Response) {
  try {
    const { roomId } = req.params;
    
    if(!roomId || typeof(roomId) !== 'string'){
      res
      .status(400)
      .json({
        success: false,
        message: "Room Id is required"
      });
      return;
    }

    /* Check if Room Exists */
    const roomExists = await prismaClient.room.findFirst({
      where: {
        slug: roomId
      }
    });

    if(!roomExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Room doesn't exists."
      });
      return;
    }

    const existingShapes = await prismaClient.shape.findMany({
      where: {
        roomId: roomExists.id
      }
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        admin: roomExists.adminId,
        roomId,
        shapes: existingShapes,
      },
      message: "Room shapes fetched successfully."
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't join room.",
      error
    });
  }
}

export async function deleteRoom(req: Request, res: Response) {
  try {
    const { roomId } = req.body;

    if(!roomId || typeof(roomId) !== 'string'){
      res
      .status(400)
      .json({
        success: false,
        message: "Room Id is required"
      });
      return;
    }

    /* Check if Room Exists */
    const roomExists = await prismaClient.room.findFirst({
      where: {
        slug: roomId,
        adminId: req.userId
      }
    });
    
    if(!roomExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Room doesn't exists."
      });
      return;
    }
    
    await prismaClient.room.delete({
      where: {
        id: roomExists.id
      }
    });

    res
    .status(200)
    .json({
      success: true,
      message: "Room deleted successfully."
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't delete room.",
      error
    });
  }
}

export async function addShape(req: Request, res: Response) {
  try {
    const {roomId, shapeId, properties} = req.body;

    /* Input Validation */
    addShapeSchema.parse({
      roomId,
      shapeId,
      properties
    });

    /* Check if Room Exists */
    const roomExists = await prismaClient.room.findFirst({
      where: {
        slug: roomId
      }
    });
    
    if(!roomExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Room doesn't exists."
      });
      return;
    }

    const shape = await prismaClient.shape.create({
      data: {
        roomId: roomExists.id,
        shapeId,
        properties: JSON.stringify(properties),
        userId: req.userId!
      }
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        shape
      },
      message: 'Shape added successfully'
    });
  } catch (error) {
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        success: false,
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }
    
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Unable to add shape at this time.",
      error: error
    });
  }
}

export async function modifyShape(req: Request, res: Response) {
  try {
    const {roomId, shapeId, properties} = req.body;

    /* Input Validation */
    addShapeSchema.parse({
      roomId,
      shapeId,
      properties
    });

    /* Check if Room Exists */
    const roomExists = await prismaClient.room.findFirst({
      where: {
        slug: roomId
      }
    });
    
    if(!roomExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Room doesn't exists."
      });
      return;
    }

    /* Check if Shape Exists */
    const shapeExists = await prismaClient.shape.findFirst({
      where: {
        shapeId,
        roomId: roomExists.id
      }
    });

    if(!shapeExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Shape doesn't exists."
      });
      return;
    }

    const shape = await prismaClient.shape.update({
      where: {
        id: shapeExists.id
      },
      data: {
        properties: JSON.stringify(properties)
      }
    });
    
    res
    .status(200)
    .json({
      success: true,
      data: {
        shape
      },
      message: 'Shape updated successfully'
    });
  } catch (error) {
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        success: false,
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }
    
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Unable to modify shape at this time.",
      error: error
    });
  }
}

export async function deleteShape(req: Request, res: Response) {
  try {
    const { roomId, shapeId } = req.query;

    /* Input Validation */
    const parsedData = deleteShapeSchema.parse({
      roomId,
      shapeId
    });

    /* Check if Room Exists */
    const roomExists = await prismaClient.room.findFirst({
      where: {
        slug: parsedData.roomId
      }
    });
    
    if(!roomExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Room doesn't exists."
      });
      return;
    }

    /* Check if Shape Exists */
    const shapeExists = await prismaClient.shape.findFirst({
      where: {
        shapeId: parsedData.shapeId,
        roomId: roomExists.id
      }
    });

    if(!shapeExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Shape doesn't exists."
      });
      return;
    }

    await prismaClient.shape.delete({
      where: {
        id: shapeExists.id
      }
    });

    res
    .status(200)
    .json({
      success: true,
      message: 'Shape deleted successfully'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Unable to delete shape at this time.",
      error: error
    });
  }
}