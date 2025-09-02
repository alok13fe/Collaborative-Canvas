import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(3, {message: "First name must be atleast 3 characters long"}),
  lastName: z.string().optional(),
  email: z.email({ message: "Invalid email format" }),
  password: z.string().min(6, {message: "Password must be at least 6 characters long"})
});

export const loginSchema = z.object({
  email: z.email({message: "Invalid email format"}),
  password: z.string().min(6, {message: "Password must be at least 6 characters long"})
});

export const googleUserSchema = z.object({
  firstName: z.string().min(3, {message: "First name must be atleast 3 characters long"}),
  lastName: z.string().optional(),
  email: z.email({ message: "Invalid email format" })
});

/* Shapes Schema */
const baseShapeSchema = z.object({
  id: z.string()
});

const rectangleSchema = baseShapeSchema.extend({
  type: z.literal("rect"),
  startX: z.number(),
  startY: z.number(),
  width: z.number(),
  height: z.number(),
});

const diamondSchema = baseShapeSchema.extend({
  type: z.literal("diamond"),
  startX: z.number(),
  startY: z.number(),
  width: z.number(),
  height: z.number(),
});

const ellipseSchema = baseShapeSchema.extend({
  type: z.literal("ellipse"),
  centerX: z.number(),
  centerY: z.number(),
  radiusX: z.number(),
  radiusY: z.number(),
});

const arrowSchema = baseShapeSchema.extend({
  type: z.literal("arrow"),
  startX: z.number(),
  startY: z.number(),
  cp1X: z.number().optional(),
  cp1Y: z.number().optional(),
  endX: z.number(),
  endY: z.number(),
});

const lineSchema = baseShapeSchema.extend({
  type: z.literal("line"),
  startX: z.number(),
  startY: z.number(),
  cp1X: z.number().optional(),
  cp1Y: z.number().optional(),
  endX: z.number(),
  endY: z.number(),
});

const pencilSchema = baseShapeSchema.extend({
  type: z.literal("pencil"),
  points: z.array(z.object({
    x: z.number(),
    y: z.number()
  }))
});

const textSchema = baseShapeSchema.extend({
  type: z.literal("text"),
  fontSize: z.number(),
  startX: z.number(),
  startY: z.number(),
  width: z.number(),
  minWidth: z.number(),
  height: z.number(),
  text: z.string(),
});

const imageSchema = baseShapeSchema.extend({
  type: z.literal("image"),
  startX: z.number(),
  startY: z.number(),
  width: z.number(),
  height: z.number(),
  url: z.string().url(),
});

export const shapeSchema = z.discriminatedUnion("type", [
  rectangleSchema,
  diamondSchema,
  ellipseSchema,
  arrowSchema,
  lineSchema,
  pencilSchema,
  textSchema,
  imageSchema,
]);

export const addShapeSchema = z.object({
  roomId: z.string(),
  shapeId: z.string(),
  properties: shapeSchema
});

export const deleteShapeSchema = z.object({
  roomId: z.string(),
  shapeId: z.string(),
});