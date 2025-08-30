import { Request, Response, NextFunction } from "express";
import { prismaClient } from "@repo/db/client";
import jwt from "jsonwebtoken";

export async function authUser(req: Request, res: Response, next: NextFunction){
  try {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
      res
      .status(401)
      .json({
        success: false,
        message: "Unauthorized Request",
      });
      return;
    }

    const token = authHeader.split(' ')[1];
  
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET as string);

    if(typeof decoded === "object" && "id" in decoded ){
      const user = await prismaClient.user.findFirst({
        where: {
          id: decoded?.id
        }
      });

      if(!user){
        res
        .status(401)
        .json({
          statusCode: 401,
          success: false,
          message: "Unauthorized Request",
        })
        return;
      }

      req.userId = decoded.id;
      next();
    }
    else{
      res
      .status(403)
      .json({
        success: false,
        message: 'Invalid Token'
      });
      return;
    }
  } catch (error) {
    res
    .status(403)
    .json({
      success: false,
      message: 'Invalid Token',
      error: error
    });
  }  
}