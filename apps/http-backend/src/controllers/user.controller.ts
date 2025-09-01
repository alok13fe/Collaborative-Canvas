import { Request, Response } from "express"
import { prismaClient } from "@repo/db/client";
import { registerSchema, loginSchema, googleUserSchema } from "@repo/common/schema";
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { uploadOnCloudinary } from '../utils/cloudinary';

export async function registerUser(req: Request, res: Response){
  try {
    const { firstName, lastName, email, password } = req.body;

    /* Input Validation */
    registerSchema.parse({
      firstName,
      lastName,
      email,
      password
    });

    /* Checking if User Already exists */
    const user = await prismaClient.user.findFirst({
      where: {
        email
      }
    });

    if(user){
      res
      .status(409)
      .json({
        message: 'User Already Exists. Please Login!'      
      });
      return;
    }

    /* Hashing Password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* Registering New User */
    await prismaClient.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword
      }
    });

    res
    .status(201)
    .json({
      success: true,
      message: 'Registeration successful! You can now log in.'
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
      message: "Server error: Unable to register user at this time.",
      error: error
    });
  }
}

export async function loginUser(req: Request, res: Response){
  try {
    const {email, password} = req.body;

    /* Input Validation */
    loginSchema.parse({
      email,
      password
    });

    /* Searching User from Database */
    const user = await prismaClient.user.findFirst({
      where: {
        email
      }
    });

    if(!user){
      res
      .status(401)
      .json({
        success: false,
        message: "Invalid Credentials"
      });
      return;
    }

    /* Validating Password */
    const isPasswordValid = await bcrypt.compare(password, user.password);
    user.password = "";

    if(!isPasswordValid){
      res
      .status(401)
      .json({
        success: false,
        message: "Invalid Credentials"
      });
      return;
    }

    if(!process.env.JWT_SECRET){
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }

    const options:jwt.SignOptions = {};
    if(process.env.JWT_EXPIRY){
      options.expiresIn = parseInt(process.env.JWT_EXPIRY);
    }

    /* Generating JWT Token */
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      options
    );

    res
    .status(200)
    .json({
      success: true,
      data: {
        user, 
        token
      },
      message: 'Login Successful'
    })
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
      message: "Server error: Unable to login user at this time.",
      error: error
    });
  }
}

export async function google(req:Request, res: Response) {
  try {
    const { firstName, lastName, email } = req.body;

    /* Input Validation */
    googleUserSchema.parse({
      firstName,
      lastName,
      email
    });

    /* Check if User Already Exists */
    const user = await prismaClient.user.findFirst({ 
      where: {
        email
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if(!process.env.JWT_SECRET){
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }

    const options:jwt.SignOptions = {};
    if(process.env.JWT_EXPIRY){
      options.expiresIn = parseInt(process.env.JWT_EXPIRY);
    }

    if(user){
      /* Generating JWT Token */
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        options
      );

      res
      .status(200)
      .json({
        success: true,
        data: {
          user, 
          token
        },
        message: 'Login Successful'
      });
      return;
    }

    /* Registering New User */
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newUser = await prismaClient.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword
      }
    });

    newUser.password = "";

    /* Generating JWT Token */
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email
      },
      process.env.JWT_SECRET,
      options
    );

    res
    .status(200)
    .json({
      success: true,
      data: {
        user: newUser, 
        token
      },
      message: 'Login Successful'
    })
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
      message: "Server error: Unable to login user at this time.",
      error: error
    });
  }
}

export async function userProfile (req: Request, res: Response){
  const user = await prismaClient.user.findFirst({
    where: {
      id: req.userId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  res
  .status(200)
  .json({
    success: true,
    data: {
      user
    },
    message: 'User Profile Fetched Successfully!'
  });
}

export async function uploadImage(req: Request, res: Response){
  try{
    const imageLocalPath = req.file?.path;

    if(!imageLocalPath){
      res
      .status(400)
      .json({
        success: false,
        message: "Image Input is required."
      });
      return;
    }

    let image = await uploadOnCloudinary(imageLocalPath);

    if(!image || !image.url){
      res
      .status(500)
      .json({
        success: false,
        message: "Failed to upload profile image. Please try again."
      });
      return;
    }

    res
    .status(200)
    .json({
      success: true,
      data: {
        width: image.width,
        height: image.height,
        url: image.url
      },
      message: "Image updated successfully.",
    });
  } catch(error){
    console.log(error);
    res
    .status(500)
    .json({
      success: true,
      message: "Server error: Couldn't upload Image at this time.",
      error
    });
  }
}