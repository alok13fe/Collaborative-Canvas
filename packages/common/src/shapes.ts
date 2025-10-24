interface BaseShape {
  id: string,
  opacity: number
}

export interface Rectangle extends BaseShape {
  type: "rect",
  stroke: string,
  fillStyle: string,
  strokeWidth: number,
  strokeStyle: number,
  startX: number,
  startY: number,
  width: number,
  height: number,
  edges?: string
}

export interface Diamond extends BaseShape {
  type: 'diamond',
  stroke: string,
  fillStyle: string,
  strokeWidth: number,
  strokeStyle: number,
  startX: number,
  startY: number,
  width: number,
  height: number,
  edges?: string
}

export interface Ellipse extends BaseShape {
  type: "ellipse",
  stroke: string,
  fillStyle: string,
  strokeWidth: number,
  strokeStyle: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
}

export interface Arrow extends BaseShape {
  type: "arrow",
  stroke: string,
  strokeWidth: number,
  strokeStyle: number,
  startX: number,
  startY: number,
  cp1X?: number,
  cp1Y?: number,
  endX: number,
  endY: number
}

export interface Line extends BaseShape {
  type: "line",
  stroke: string,
  strokeWidth: number,
  strokeStyle: number,
  startX: number,
  startY: number,
  cp1X?: number,
  cp1Y?: number,
  endX: number,
  endY: number,
}

export interface PencilPath extends BaseShape {
  type: 'pencil',
  stroke: string,
  strokeWidth: number,
  points: { x: number, y: number }[],
}

export interface Text extends BaseShape {
  type: 'text',
  stroke: string,
  fontFamily: string,
  fontSize: number,
  textAlign: 'left' | 'center' | 'right',
  startX: number, 
  startY: number,
  width: number,
  minWidth: number,
  height: number,
  text: string
}

export interface Image extends BaseShape {
  type: 'image',
  startX: number,
  startY: number,
  width: number,
  height: number,
  url: string
}

export type Shape = Rectangle | Diamond | Ellipse | Arrow | Line | PencilPath | Text | Image;




/* Handle Types */

export interface CornerHandle {
  type: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  startX: number,
  startY: number,
  width: number,
  height: number
}

export interface SideHandle {
  type: 'left' | 'top' | 'bottom' | 'right',
  startX: number,
  startY: number,
  endX: number,
  endY: number,
}

export interface BodyHandle {
  type: 'body',
  startX: number,
  startY: number,
  width: number,
  height: number
}

export interface AnchorPoint {
  type: 'anchor-point-start' | 'anchor-point-end',
  x: number,
  y: number,
  radius: number
}

export interface ControlPoint {
  type: 'control-point',
  x: number,
  y: number,
  radius: number
}

export interface LineHandle {
  type: 'line-body',
  startX: number,
  startY: number,
  cp1X?: number,
  cp1Y?: number,
  endX: number, 
  endY: number,
}

export interface RotationHandle {
  type: 'rotate',
  x: number,
  y: number,
  radius: number
}

export interface SelectionBody{
  type: 'selection-body',
  startX: number,
  startY: number,
  width: number,
  height: number
}

export type Handle = CornerHandle | SideHandle | BodyHandle | AnchorPoint | ControlPoint | LineHandle | RotationHandle | SelectionBody;




export interface ShapeProperties {
  stroke: string,
  fillStyle: string,
  strokeWidth: number,
  strokeStyle: number,
  edges: 'corner' | 'round',
  fontFamily: string,
  fontSize: number,
  textAlign: 'left' | 'center' | 'right',
  opacity: number
}