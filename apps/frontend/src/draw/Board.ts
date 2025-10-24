import type { AppDispatch } from "@/lib/store";
import type { Rectangle, Diamond, Ellipse, Text, Image, Shape, CornerHandle, BodyHandle, SelectionBody, LineHandle, Handle, AnchorPoint, ControlPoint, RotationHandle, SideHandle, ShapeProperties } from "@repo/common/shapes";
import { addShape, modifyShapes, clearSelection, selectShape, deleteShapes } from "@/lib/features/board/boardSlice";
import { nanoid } from 'nanoid';

export class Board {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dispatch: AppDispatch; 
  private roomId: string | null;
  private socket: WebSocket | null;

  private shapeProperties: ShapeProperties;
  public panOffset: {x: number; y: number};
  public zoomLevel: number;
  private selectedTool: number;
  private isDrawing: boolean;
  public shiftKeyDown: boolean;
  public controlKeyDown: boolean;
  private startX = 0;
  private startY = 0;
  private previousPosition = {x: 0, y: 0};
  private handles: Handle[];
  private activeHandle: { type: string } | null = null;
  private originalGroupBounds: {x: number, y: number, width: number, height: number} | null = null;
  private tempPathPoints: { x: number, y: number }[] = [];
  private timerId: NodeJS.Timeout | null = null;

  constructor(canvas: HTMLCanvasElement, dispatch: AppDispatch, shapeProperties: ShapeProperties, socket?: WebSocket, roomId?: string){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.dispatch = dispatch;
    
    canvas.width = 2000;
    canvas.height = 1000;
    
    this.shapeProperties = shapeProperties;
    this.roomId = roomId || null;
    this.socket = socket || null;
    this.panOffset = {x: 0, y: 0};
    this.zoomLevel = 100;
    this.isDrawing = false;
    this.selectedTool = 1;
    this.shiftKeyDown = false;
    this.controlKeyDown = false;
    this.handles = [];

    this.init();
  }

  private init(){
    const dpr = window.devicePixelRatio || 1;
    
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.scale(dpr, dpr);

    this.clearCanvas();
  }

  private clearCanvas(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgb(255,255,255)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public handleMouseDown(client: {x: number, y: number}, shapes: Shape[], selectedShapes: string[]){
    this.isDrawing = true;
    this.startX = client.x;
    this.startY = client.y;
    this.previousPosition = client;

    if(this.selectedTool === 1){
      if(this.handles.length !== 0){
        const clickedHandle = this.handles.find((handle) => {
          if(handle.type === 'top-left' || handle.type === 'top-right' || handle.type === 'bottom-left' || handle.type === 'bottom-right'){
            return this.isPointInShape(client.x, client.y, handle);
          }
          else if(handle.type === 'top' || handle.type === 'left' || handle.type === 'bottom' || handle.type === 'right'){
            return this.isPointOnShape(client.x, client.y, handle);
          }
          else if(handle.type === 'rotate' || handle.type === 'anchor-point-start' || handle.type === 'anchor-point-end' || handle.type === 'control-point'){
            return this.isPointInShape(client.x, client.y, handle);
          }
          else if(handle.type === 'selection-body'){
            return this.isPointInShape(client.x, client.y, handle);
          }
          else if(handle.type === 'body'){
            return this.isPointInShape(client.x, client.y, handle);
          }
          else if(handle.type === 'line-body'){
            return this.isPointOnShape(client.x, client.y, handle);
          }
        });

        if(clickedHandle){
          this.activeHandle = { type: clickedHandle.type };
          if(selectedShapes.length > 1){
            this.originalGroupBounds = this.getBoundingBoxOfShapes();
          }
        }
        else {
          if(this.shiftKeyDown){
            shapes.map(shape => {
              if((shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'ellipse') && shape.fillStyle !== 'transparent'){
                if(this.isPointInShape(client.x, client.y, shape)){
                  this.dispatch(selectShape(shape.id));
                }
              }
              else if(shape.type === 'text' || shape.type === 'image'){
                if(this.isPointInShape(client.x, client.y, shape)){
                  this.dispatch(selectShape(shape.id));
                }
              }
              else if(this.isPointOnShape(client.x, client.y, shape)){
                this.dispatch(selectShape(shape.id));
              }
            });
          }
          else{
            this.dispatch(clearSelection());
            
            let selectedShapeId: string | null = null;
            shapes.map(shape => {
              if((shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'ellipse') && shape.fillStyle !== 'transparent'){
                if(this.isPointInShape(client.x, client.y, shape)){
                  selectedShapeId = shape.id;
                }
              }
              else if(shape.type === 'text' || shape.type === 'image'){
                if(this.isPointInShape(client.x, client.y, shape)){
                  selectedShapeId = shape.id;
                }
              }
              else if(this.isPointOnShape(client.x, client.y, shape)){
                selectedShapeId = shape.id;
              }
            });
            
            if(selectedShapeId){
              this.dispatch(selectShape(selectedShapeId));
            }
          }
        }
      }
      else {
        let selectedShapeId: string | null = null;
        shapes.map(shape => {
          if((shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'ellipse') && shape.fillStyle !== 'transparent'){
            if(this.isPointInShape(client.x, client.y, shape)){
              selectedShapeId = shape.id;
            }
          }
          else if(shape.type === 'text' || shape.type === 'image'){
            if(this.isPointInShape(client.x, client.y, shape)){
              selectedShapeId = shape.id;
            }
          }
          else if(this.isPointOnShape(client.x, client.y, shape)){
            selectedShapeId = shape.id;
          }
        });
        
        if(selectedShapeId){
          this.dispatch(selectShape(selectedShapeId));
        }
      }
    }
    else if(this.selectedTool === 7){
      this.tempPathPoints = [{ x: client.x, y: client.y }];
    }
  }

  public handleMouseMove(client: {x: number, y: number}, shapes: Shape[], selectedShapes: string[]){
    if(this.isDrawing){
      this.redraw(shapes, selectedShapes);

      if(this.selectedTool === 1){
        if(selectedShapes.length === 0){
          this.ctx.strokeStyle = "rgb(96, 80, 220)";
          this.ctx.fillStyle = "rgba(204, 204, 255, 0.20)";
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(this.startX + 0.5, this.startY + 0.5, client.x - this.startX, client.y - this.startY);
          this.ctx.fillRect(this.startX + 0.5, this.startY + 0.5, client.x - this.startX, client.y - this.startY);
        }
        else{
          const dx = client.x - this.previousPosition.x, dy = client.y - this.previousPosition.y;
          const selected: Shape[] = shapes.filter(shape => selectedShapes.includes(shape.id));

          if(this.activeHandle){
            if(this.activeHandle.type === 'top-left'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.startX += dx;
                  shape.startY += dy;
                  shape.width -= dx;
                  shape.height -= dy;

                  if(shape.width < 0){
                    shape.startX = shape.startX + shape.width;
                    shape.width = Math.abs(shape.width);
                    this.activeHandle.type = 'top-right';
                  }

                  if(shape.height < 0){
                    shape.startY = shape.startY + shape.height;
                    shape.height = Math.abs(shape.height);
                    this.activeHandle.type = 'bottom-left';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerX += dx / 2;
                  shape.centerY += dy / 2;
                  shape.radiusX -= dx / 2;
                  shape.radiusY -= dy / 2;

                  if(shape.radiusX < 0){
                    shape.radiusX = Math.abs(shape.radiusX);
                    this.activeHandle.type = 'top-right';
                  }

                  if(shape.radiusY < 0){
                    shape.radiusY = Math.abs(shape.radiusY);
                    this.activeHandle.type = 'bottom-left';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                  const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                  const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                  const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                  
                  const newWidth = width - dx;
                  const newHeight = height - dy;

                  if(newWidth < 0){
                    this.activeHandle.type = 'top-right';
                  }

                  if(newHeight < 0){
                    this.activeHandle.type = 'bottom-left';
                  }

                  const scaleX = newWidth / width;
                  const scaleY = newHeight / height;

                  shape.startX = minX + width + (shape.startX - minX - width) * scaleX;
                  shape.startY = minY + height + (shape.startY - minY - height) * scaleY;
                  shape.endX = minX + width + (shape.endX - minX - width) * scaleX;
                  shape.endY = minY + height + (shape.endY - minY - height) * scaleY;

                  if(shape.cp1X && shape.cp1Y){
                      shape.cp1X = minX + width + (shape.cp1X - minX - width) * scaleX;
                      shape.cp1Y = minY + height + (shape.cp1Y - minY - height) * scaleY;
                  }
                }
                else if(shape.type === 'text'){
                  const newHeight = shape.height - dy;
                  const minHeight = (shape.height / shape.fontSize) * 10;

                  if (newHeight > minHeight) {
                    const scale = newHeight / shape.height;
                    const newFontSize = shape.fontSize * scale;
                    
                    shape.startX = shape.startX + shape.width * ( 1 - scale); 
                    shape.width = shape.width * scale; 
                    shape.startY = shape.startY + dy;
                    shape.height = newHeight;
                    shape.fontSize = newFontSize;
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'top-right'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.width += dx;
                  shape.startY += dy;
                  shape.height -= dy;

                  if (shape.width < 0) {
                    shape.startX = shape.startX + shape.width; 
                    shape.width = Math.abs(shape.width); 
                    this.activeHandle.type = 'top-left'; 
                  }

                  if (shape.height < 0) {
                    shape.startY = shape.startY + shape.height; 
                    shape.height = Math.abs(shape.height); 
                    this.activeHandle.type = 'bottom-right';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerX += dx / 2;
                  shape.centerY += dy / 2;
                  shape.radiusX += dx / 2;
                  shape.radiusY -= dy / 2;

                  if(shape.radiusX < 0){
                    shape.radiusX = Math.abs(shape.radiusX);
                    this.activeHandle.type = 'top-left';
                  }

                  if(shape.radiusY < 0){
                    shape.radiusY = Math.abs(shape.radiusY);
                    this.activeHandle.type = 'bottom-right';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                  const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                  const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                  const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                  
                  const newWidth = width + dx;
                  const newHeight = height - dy;

                  if(newWidth < 0){
                    this.activeHandle.type = 'top-left';
                  }

                  if(newHeight < 0){
                    this.activeHandle.type = 'bottom-right';
                  }

                  const scaleX = newWidth / width;
                  const scaleY = newHeight / height;

                  shape.startX = minX + (shape.startX - minX) * scaleX;
                  shape.startY = minY + height + (shape.startY - minY - height) * scaleY;
                  shape.endX = minX + (shape.endX - minX) * scaleX;
                  shape.endY = minY + height + (shape.endY - minY - height) * scaleY;

                  if(shape.cp1X && shape.cp1Y){
                      shape.cp1X = minX + (shape.cp1X - minX) * scaleX;
                      shape.cp1Y = minY + height + (shape.cp1Y - minY - height) * scaleY;
                  }
                }
                else if(shape.type === 'text'){
                  const newHeight = shape.height - dy;
                  const minHeight = (shape.height / shape.fontSize) * 10;

                  if (newHeight > minHeight) {
                    const scale = newHeight / shape.height;
                    const newFontSize = shape.fontSize * scale;
                    
                    shape.width = shape.width * scale; 
                    shape.startY = shape.startY + dy;
                    shape.height = newHeight;
                    shape.fontSize = newFontSize;
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'bottom-right'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.width += dx;
                  shape.height += dy;

                  if(shape.width < 0){
                    shape.startX = shape.startX + shape.width;
                    shape.width = Math.abs(shape.width);
                    this.activeHandle.type = 'bottom-left';
                  }

                  if(shape.height < 0){
                    shape.startY = shape.startY + shape.height;
                    shape.height = Math.abs(shape.height);
                    this.activeHandle.type = 'top-right';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerX += dx / 2; 
                  shape.centerY += dy / 2; 
                  shape.radiusX += dx / 2;
                  shape.radiusY += dy / 2;

                  if(shape.radiusX < 0){
                    shape.radiusX = Math.abs(shape.radiusX);
                    this.activeHandle.type = 'bottom-left';
                  }

                  if(shape.radiusY < 0){
                    shape.radiusY = Math.abs(shape.radiusY);
                    this.activeHandle.type = 'top-right';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                  const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                  const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                  const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                  
                  const newWidth = width + dx;
                  const newHeight = height + dy;

                  if(newWidth < 0){
                    this.activeHandle.type = 'bottom-left';
                  }

                  if(newHeight < 0){
                    this.activeHandle.type = 'top-right';
                  }

                  const scaleX = newWidth / width;
                  const scaleY = newHeight / height;

                  shape.startX = minX + (shape.startX - minX) * scaleX;
                  shape.startY = minY + (shape.startY - minY) * scaleY;
                  shape.endX = minX + (shape.endX - minX) * scaleX;
                  shape.endY = minY + (shape.endY - minY) * scaleY;

                  if(shape.cp1X && shape.cp1Y){
                      shape.cp1X = minX + (shape.cp1X - minX) * scaleX;
                      shape.cp1Y = minY + (shape.cp1Y - minY) * scaleY;
                  }
                }
                else if(shape.type === 'text'){
                  const newHeight = shape.height + dy;
                  const minHeight = (shape.height / shape.fontSize) * 10;

                  if (newHeight > minHeight) {
                    const scale = newHeight / shape.height;
                    const newFontSize = shape.fontSize * scale;
                    
                    shape.width = shape.width * scale; 
                    shape.height = newHeight;
                    shape.fontSize = newFontSize;
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'bottom-left'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.startX += dx;
                  shape.width -= dx;
                  shape.height += dy;

                  if(shape.width < 0){
                    shape.startX = shape.startX + shape.width;
                    shape.width = Math.abs(shape.width);
                    this.activeHandle.type = 'bottom-right';
                  }

                  if(shape.height < 0){
                    shape.startY = shape.startY + shape.height;
                    shape.height = Math.abs(shape.height);
                    this.activeHandle.type = 'top-left';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerX += dx / 2;
                  shape.centerY += dy / 2;
                  shape.radiusX -= dx / 2;
                  shape.radiusY += dy / 2;

                  if(shape.radiusX < 0){
                    shape.radiusX = Math.abs(shape.radiusX);
                    this.activeHandle.type = 'bottom-right';
                  }

                  if(shape.radiusY < 0){
                    shape.radiusY = Math.abs(shape.radiusY);
                    this.activeHandle.type = 'top-left';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                  const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                  const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                  const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                  
                  const newWidth = width - dx;
                  const newHeight = height + dy;

                  if(newWidth < 0){
                    this.activeHandle.type = 'bottom-right';
                  }

                  if(newHeight < 0){
                    this.activeHandle.type = 'top-left';
                  }

                  const scaleX = newWidth / width;
                  const scaleY = newHeight / height;

                  shape.startX = minX + width + (shape.startX - minX - width) * scaleX;
                  shape.startY = minY + (shape.startY - minY) * scaleY;
                  shape.endX = minX + width + (shape.endX - minX - width) * scaleX;
                  shape.endY = minY + (shape.endY - minY) * scaleY;

                  if(shape.cp1X && shape.cp1Y){
                      shape.cp1X = minX + width + (shape.cp1X - minX - width) * scaleX;
                      shape.cp1Y = minY + (shape.cp1Y - minY) * scaleY;
                  }
                }
                else if(shape.type === 'text'){
                  const newHeight = shape.height + dy;
                  const minHeight = (shape.height / shape.fontSize) * 10;

                  if (newHeight > minHeight) {
                    const scale = newHeight / shape.height;
                    const newFontSize = shape.fontSize * scale;
                    
                    shape.startX = shape.startX + shape.width * ( 1 - scale); 
                    shape.width = shape.width * scale; 
                    shape.height = newHeight;
                    shape.fontSize = newFontSize;
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'top'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.startY += dy;
                  shape.height -= dy;
                  
                  if(shape.height < 0){
                    shape.startY = shape.startY + shape.height;
                    shape.height = Math.abs(shape.height);
                    this.activeHandle.type = 'bottom';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerY += dy / 2;
                  shape.radiusY -= dy / 2;

                  if(shape.radiusY < 0){
                    shape.radiusY = Math.abs(shape.radiusY);
                    this.activeHandle.type = 'bottom';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                  const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                  
                  const newHeight = height - dy;
                  
                  if (height === 0 && newHeight === 0) return;
                  
                  if(newHeight < 0){
                    this.activeHandle.type = 'bottom';
                  }

                  const scaleY = (height === 0) ? 1 : newHeight / height;

                  shape.startY = minY + height + (shape.startY - minY - height) * scaleY;
                  shape.endY = minY + height + (shape.endY - minY - height) * scaleY;

                  if(shape.cp1X && shape.cp1Y){
                    shape.cp1Y = minY + height + (shape.cp1Y - minY - height) * scaleY;
                  }
                }
                else if(shape.type === 'text'){
                  const newHeight = shape.height - dy;
                  const minHeight = (shape.height / shape.fontSize) * 10;

                  if (newHeight > minHeight) {
                    const scale = newHeight / shape.height;
                    const newFontSize = shape.fontSize * scale;
                    
                    shape.startX = shape.startX + shape.width * ( 1 - scale); 
                    shape.width = shape.width * scale; 
                    shape.startY = shape.startY + dy;
                    shape.height = newHeight;
                    shape.fontSize = newFontSize;
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'right'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.width += dx;

                  if(shape.width < 0){
                    shape.startX = shape.startX + shape.width;
                    shape.width = Math.abs(shape.width);
                    this.activeHandle.type = 'left';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerX += dx / 2; 
                  shape.radiusX += dx / 2;

                  if(shape.radiusX < 0){
                    shape.radiusX = Math.abs(shape.radiusX);
                    this.activeHandle.type = 'left';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                  const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;

                  const newWidth = width + dx;
                  
                  if (width === 0 && newWidth === 0) return;

                  if(newWidth < 0){
                    this.activeHandle.type = 'left';
                  }

                  const scaleX = (width === 0) ? 1 :newWidth / width;

                  shape.startX = minX + (shape.startX - minX) * scaleX;
                  shape.endX = minX + (shape.endX - minX) * scaleX;

                  if(shape.cp1X && shape.cp1Y){
                    shape.cp1X = minX + (shape.cp1X - minX) * scaleX;
                  }
                }
                else if(shape.type === 'text'){
                  if((shape.width + dx) >= shape.minWidth){
                    shape.width += dx;                    
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'bottom'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.height += dy;

                  if(shape.height < 0){
                    shape.startY = shape.startY + shape.height;
                    shape.height = Math.abs(shape.height);
                    this.activeHandle.type = 'top';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerY += dy / 2; 
                  shape.radiusY += dy / 2;

                  if(shape.radiusY < 0){
                    shape.radiusY = Math.abs(shape.radiusY);
                    this.activeHandle.type = 'top-left';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                  const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                  
                  const newHeight = height + dy;
                  
                  if (height === 0 && newHeight === 0) return;
                  
                  if(newHeight < 0){
                    this.activeHandle.type = 'top';
                  }

                  const scaleY = (height === 0) ? 1 : newHeight / height;

                  shape.startY = minY + (shape.startY - minY) * scaleY;
                  shape.endY = minY + (shape.endY - minY) * scaleY;

                  if(shape.cp1X && shape.cp1Y){
                    shape.cp1Y = minY + (shape.cp1Y - minY) * scaleY;
                  }
                }
                else if(shape.type === 'text'){
                  const newHeight = shape.height + dy;
                  const minHeight = (shape.height / shape.fontSize) * 10;

                  if (newHeight > minHeight) {
                    const scale = newHeight / shape.height;
                    const newFontSize = shape.fontSize * scale;
                    
                    shape.width = shape.width * scale; 
                    shape.height = newHeight;
                    shape.fontSize = newFontSize;
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'left'){
              if(selected.length === 1){
                const shape = { ...selected[0] };

                if(shape.type === 'rect' || shape.type === 'diamond'){
                  shape.startX += dx;
                  shape.width -= dx;

                  if(shape.width < 0){
                    shape.startX = shape.startX + shape.width;
                    shape.width = Math.abs(shape.width);
                    this.activeHandle.type = 'right';
                  }
                }
                else if(shape.type === 'ellipse'){
                  shape.centerX += dx / 2;
                  shape.radiusX -= dx / 2;

                  if(shape.radiusX < 0){
                    shape.radiusX = Math.abs(shape.radiusX);
                    this.activeHandle.type = 'right';
                  }
                }
                else if(shape.type === 'line' || shape.type === 'arrow'){
                  const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                  const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                  
                  const newWidth = width - dx;
                  
                  if(width === 0 && newWidth === 0) return;

                  if(newWidth < 0){
                    this.activeHandle.type = 'right';
                  }

                  const scaleX = (width === 0) ? 1 : newWidth / width;

                  shape.startX = minX + width + (shape.startX - minX - width) * scaleX;
                  shape.endX = minX + width + (shape.endX - minX - width) * scaleX;

                  if(shape.cp1X && shape.cp1Y){
                    shape.cp1X = minX + width + (shape.cp1X - minX - width) * scaleX;
                  }
                }
                else if(shape.type === 'text'){
                  if((shape.width - dx) >= shape.minWidth){
                    shape.startX += dx;
                    shape.width -= dx;                    
                  }
                }

                this.modifyShapes([shape]);
              }
            }
            else if(this.activeHandle.type === 'selection-body'){
              const updatedShapes: Shape[] = selected.map((shape) => {
                const shapeToModify: Shape = { ...shape };

                switch(shapeToModify.type){
                  case "rect":
                  case "diamond":
                  case "text":
                  case "image":
                    shapeToModify.startX += dx;
                    shapeToModify.startY += dy;
                    break;
                  case "ellipse":
                    shapeToModify.centerX += dx;
                    shapeToModify.centerY += dy;
                    break;
                  case "line":
                  case "arrow":
                    shapeToModify.startX += dx;
                    shapeToModify.startY += dy;
                    if(shapeToModify.cp1X && shapeToModify.cp1Y){
                      shapeToModify.cp1X += dx;
                      shapeToModify.cp1Y += dy;
                    }
                    shapeToModify.endX += dx;
                    shapeToModify.endY += dy;
                    break;
                  case "pencil":
                    shapeToModify.points = shapeToModify.points.map(point => ({
                      x: point.x + dx,
                      y: point.y + dy,
                    }));
                    break;
                }
                return shapeToModify;
              });

              this.modifyShapes(updatedShapes);
            }
            else if(this.activeHandle.type === 'body'){
              const updatedShapes: Shape[] = selected.map((shape) => {
                const shapeToModify: Shape = { ...shape };

                switch(shapeToModify.type){
                  case "rect":
                  case "diamond":
                  case "text":
                  case "image":
                    shapeToModify.startX += dx;
                    shapeToModify.startY += dy;
                    break;
                  case "ellipse":
                    shapeToModify.centerX += dx;
                    shapeToModify.centerY += dy;
                    break;
                  case "line":
                  case "arrow":
                    shapeToModify.startX += dx;
                    shapeToModify.startY += dy;
                    if(shapeToModify.cp1X && shapeToModify.cp1Y){
                      shapeToModify.cp1X += dx;
                      shapeToModify.cp1Y += dy;
                    }
                    shapeToModify.endX += dx;
                    shapeToModify.endY += dy;
                    break;
                  case "pencil":
                    shapeToModify.points = shapeToModify.points.map(point => ({
                      x: point.x + dx,
                      y: point.y + dy,
                    }));
                    break;
                }
                return shapeToModify;
              });

              this.modifyShapes(updatedShapes);
            }
            else if(this.activeHandle.type === 'line-body'){
              const updatedShapes: Shape[] = selected.map((shape) => {
                const shapeToModify: Shape = { ...shape };

                switch(shapeToModify.type){
                  case "line":
                  case "arrow":
                    shapeToModify.startX += dx;
                    shapeToModify.startY += dy;
                    if(shapeToModify.cp1X && shapeToModify.cp1Y){
                      shapeToModify.cp1X += dx;
                      shapeToModify.cp1Y += dy;
                    }
                    shapeToModify.endX += dx;
                    shapeToModify.endY += dy;
                    break;
                }
                return shapeToModify;
              });

              this.modifyShapes(updatedShapes);
            }
            else if(this.activeHandle.type === 'anchor-point-start'){
              const updatedShapes: Shape[] = selected.map((shape) => {
                const shapeToModify = {...shape};

                switch(shapeToModify.type){
                  case "line":
                  case "arrow":
                    shapeToModify.startX += dx;
                    shapeToModify.startY += dy;
                }
                return shapeToModify;
              });
              this.modifyShapes(updatedShapes);
            }
            else if(this.activeHandle.type === 'anchor-point-end'){
              const updatedShapes: Shape[] = selected.map((shape) => {
                const shapeToModify = {...shape};

                switch(shapeToModify.type){
                  case "line":
                  case "arrow":
                    shapeToModify.endX += dx;
                    shapeToModify.endY += dy;
                }
                return shapeToModify;
              });
              this.modifyShapes(updatedShapes);
            }
            else if(this.activeHandle.type === 'control-point'){
              const updatedShapes: Shape[] = selected.map((shape) => {
                const shapeToModify = {...shape};

                switch(shapeToModify.type){
                  case "line":
                  case "arrow":
                    if(shapeToModify.cp1X && shapeToModify.cp1Y){
                      shapeToModify.cp1X += dx;
                      shapeToModify.cp1Y += dy;
                    }
                    else {
                      const centerX = (shapeToModify.startX + shapeToModify.endX) / 2, centerY = (shapeToModify.startY + shapeToModify.endY) / 2;
                      shapeToModify.cp1X = centerX + dx;
                      shapeToModify.cp1Y = centerY + dy;
                    }
                    break;
                } 
                  return shapeToModify;
              });
              this.modifyShapes(updatedShapes);
            }
          }
          
          this.previousPosition = client;
        }
      }
      else if(this.selectedTool === 2){
        let width = client.x - this.startX;
        let height = client.y - this.startY;

        if(this.shiftKeyDown){
          const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
          const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

          width = updatedWidth;
          height = updatedHeight;
        }

        this.drawShape({
          id: 'new-shape',
          type: "rect",
          stroke: this.shapeProperties.stroke,
          fillStyle: this.shapeProperties.fillStyle,
          strokeWidth: this.shapeProperties.strokeWidth,
          strokeStyle: this.shapeProperties.strokeStyle,
          startX: this.startX,
          startY: this.startY,
          width,
          height,
          opacity: this.shapeProperties.opacity
        });
      }
      else if(this.selectedTool === 3){
        let width = client.x - this.startX;
        let height = client.y - this.startY;

        if(this.shiftKeyDown){
          const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
          const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

          width = updatedWidth;
          height = updatedHeight;
        }

        this.drawShape({
          id: 'new-shape',
          type: "diamond",
          stroke: this.shapeProperties.stroke,
          fillStyle: this.shapeProperties.fillStyle,
          strokeWidth: this.shapeProperties.strokeWidth,
          strokeStyle: this.shapeProperties.strokeStyle,
          startX: this.startX,
          startY: this.startY,
          width,
          height,
          opacity: this.shapeProperties.opacity
        })
      }
      else if(this.selectedTool === 4){
        let radiusX = Math.floor((client.x - this.startX) / 2);
        let radiusY = Math.floor((client.y - this.startY) / 2);

        if(this.shiftKeyDown){
          const updatedRadiusX = (radiusX > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));
          const updatedRadiusY = (radiusY > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));

          radiusX = updatedRadiusX;
          radiusY = updatedRadiusY;
        }

        this.drawShape({
          id: 'new-shape',
          type: "ellipse",
          stroke: this.shapeProperties.stroke,
          fillStyle: this.shapeProperties.fillStyle,
          strokeWidth: this.shapeProperties.strokeWidth,
          strokeStyle: this.shapeProperties.strokeStyle,
          centerX: this.startX + radiusX,
          centerY: this.startY + radiusY,
          radiusX: Math.abs(radiusX),
          radiusY: Math.abs(radiusY),
          opacity: this.shapeProperties.opacity
        })
      }
      else if(this.selectedTool === 5){
        this.drawShape({
          id: 'new-shape',
          type: "arrow",
          stroke: this.shapeProperties.stroke,
          strokeWidth: this.shapeProperties.strokeWidth,
          strokeStyle: this.shapeProperties.strokeStyle,
          startX: this.startX,
          startY: this.startY,
          endX: client.x,
          endY: client.y,
          opacity: this.shapeProperties.opacity
        })
      }
      else if(this.selectedTool === 6){
        this.drawShape({
          id: 'new-shape',
          type: "line",
          stroke: this.shapeProperties.stroke,
          strokeWidth: this.shapeProperties.strokeWidth,
          strokeStyle: this.shapeProperties.strokeStyle,
          startX: this.startX,
          startY: this.startY,
          endX: client.x,
          endY: client.y,
          opacity: this.shapeProperties.opacity
        })
      }
      else if(this.selectedTool === 7){
        this.tempPathPoints.push({ x: client.x, y: client.y });
        
        this.drawShape({
          id: 'new-shape',
          type: 'pencil',
          stroke: this.shapeProperties.stroke,
          strokeWidth: this.shapeProperties.strokeWidth,
          points: this.tempPathPoints,
          opacity: this.shapeProperties.opacity
        })
      }
      else if(this.selectedTool === 9){
        const dx = client.x - this.previousPosition.x, dy = client.y - this.previousPosition.y;

        const newX = this.panOffset.x + dx, newY = this.panOffset.y + dy;
        if(newX <= 0 && newY <= 0){
          this.panOffset = {
            x: newX,
            y: newY,
          }
        }

        this.previousPosition = client;
      }
      else if(this.selectedTool === 0){
        shapes.map((shape) => {
          if((shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'ellipse') && shape.fillStyle !== 'transparent'){
            if(this.isPointInShape(client.x, client.y, shape)){
              this.dispatch(deleteShapes([shape.id]));
            }
          }
          else if(shape.type === 'text' || shape.type === 'image'){
            if(this.isPointInShape(client.x, client.y, shape)){
              this.dispatch(deleteShapes([shape.id]));
            }
          }
          else if(this.isPointOnShape(client.x, client.y, shape)){
            this.dispatch(deleteShapes([shape.id]));
          }
        })
      }
    }
    else{
      if(this.selectedTool === 1){
        let cursor = 'auto';
        shapes.map((shape) => {
          if((shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'ellipse') && shape.fillStyle !== 'transparent'){
            if(this.isPointInShape(client.x, client.y, shape)){
              cursor = 'move';
            }
          }
          else if(shape.type === 'text' || shape.type === 'image'){
            if(this.isPointInShape(client.x, client.y, shape)){
              cursor = 'move';
            }
          }
          else if(this.isPointOnShape(client.x, client.y, shape)){
            cursor = 'move';
          }
        });

        for(let i = 0; i < this.handles.length; i++){
          const handle = this.handles[i];

          if(handle.type === 'top-left' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'nw-resize';
            break;
          }
          else if(handle.type === 'top-right' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'ne-resize';
            break;
          }
          else if(handle.type === 'bottom-right' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'se-resize';
            break;
          }
          else if(handle.type === 'bottom-left' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'sw-resize';
            break;
          }
          else if(handle.type === 'top' && this.isPointOnShape(client.x, client.y, handle)){
            cursor = "n-resize";
            break;
          }
          else if(handle.type === 'right' && this.isPointOnShape(client.x, client.y, handle)){
            cursor = "e-resize";
            break;
          }
          else if(handle.type === 'bottom' && this.isPointOnShape(client.x, client.y, handle)){
            cursor = "s-resize";
            break;
          }
          else if(handle.type === 'left' && this.isPointOnShape(client.x, client.y, handle)){
            cursor = "w-resize";
            break;
          }
          else if((handle.type === 'anchor-point-start' || handle.type === 'anchor-point-end' || handle.type === 'control-point') && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'pointer';
            break;
          }
          else if(handle.type === 'selection-body' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'move';
            break;
          }
          else if(handle.type === 'body' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'move';
            break;
          }
          else if(handle.type === 'rotate' && this.isPointInShape(client.x, client.y, handle)){
            cursor = 'grab';
            break;
          }
        }

        this.canvas.style.cursor = cursor;
      }
    }
  }

  public handleMouseUp(client: {x: number, y: number}, shapes: Shape[], selectedShapes: string[]){
    this.isDrawing = false;
    let newShape: Shape | null = null;
    
    if(this.selectedTool === 1){
      this.activeHandle = null;

      if(selectedShapes.length === 0){
        const area = Math.abs((client.x - this.startX) * (client.y - this.startY));

        if(area > 100){
          this.selectShapesWithinRect(shapes, this.startX, this.startY, client.x, client.y);
        }
      }
    }
    else if(this.selectedTool === 2){
      const startX = Math.min(this.startX, client.x), startY = Math.min(this.startY, client.y);
      let width = Math.abs(client.x - this.startX), height = Math.abs(client.y - this.startY);

      if(this.shiftKeyDown){
        const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
        const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

        width = updatedWidth;
        height = updatedHeight;
      }

      newShape = {
        id: 'new-shape',
        type: "rect",
        stroke: this.shapeProperties.stroke,
        fillStyle: this.shapeProperties.fillStyle,
        strokeWidth: this.shapeProperties.strokeWidth,
        strokeStyle: this.shapeProperties.strokeStyle,
        startX,
        startY,
        width,
        height,
        opacity: this.shapeProperties.opacity
      }
    }
    else if(this.selectedTool === 3){
      const startX = Math.min(this.startX, client.x), startY = Math.min(this.startY, client.y);
      let width = Math.abs(client.x - this.startX), height = Math.abs(client.y - this.startY);

      if(this.shiftKeyDown){
        const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
        const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

        width = updatedWidth;
        height = updatedHeight;
      }

      newShape = {
        id: 'new-shape',
        type: "diamond",
        stroke: this.shapeProperties.stroke,
        fillStyle: this.shapeProperties.fillStyle,
        strokeWidth: this.shapeProperties.strokeWidth,
        strokeStyle: this.shapeProperties.strokeStyle,
        startX,
        startY,
        width,
        height,
        opacity: this.shapeProperties.opacity
      }
    }
    else if (this.selectedTool === 4){
      let radiusX = Math.floor((client.x - this.startX) / 2);
      let radiusY = Math.floor((client.y - this.startY) / 2);

      if(this.shiftKeyDown){
        const updatedRadiusX = (radiusX > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));
        const updatedRadiusY = (radiusY > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));

        radiusX = updatedRadiusX;
        radiusY = updatedRadiusY;
      }

      newShape = {
        id: 'new-shape',
        type: "ellipse",
        stroke: this.shapeProperties.stroke,
        fillStyle: this.shapeProperties.fillStyle,
        strokeWidth: this.shapeProperties.strokeWidth,
        strokeStyle: this.shapeProperties.strokeStyle,
        centerX: this.startX + radiusX,
        centerY: this.startY + radiusY,
        radiusX: Math.abs(radiusX),
        radiusY: Math.abs(radiusY),
        opacity: this.shapeProperties.opacity
      }
    }
    else if(this.selectedTool === 5){
      newShape = {
        id: 'new-shape',
        type: "arrow",
        stroke: this.shapeProperties.stroke,
        strokeWidth: this.shapeProperties.strokeWidth,
        strokeStyle: this.shapeProperties.strokeStyle,
        startX: this.startX,
        startY: this.startY,
        endX: client.x,
        endY: client.y,
        opacity: this.shapeProperties.opacity
      }
    }
    else if(this.selectedTool === 6){
      newShape = {
        id: 'new-shape',
        type: "line",
        stroke: this.shapeProperties.stroke,
        strokeWidth: this.shapeProperties.strokeWidth,
        strokeStyle: this.shapeProperties.strokeStyle,
        startX: this.startX,
        startY: this.startY,
        endX: client.x,
        endY: client.y,
        opacity: this.shapeProperties.opacity
      }
    }
    else if(this.selectedTool === 7){
      newShape = {
        id: 'new-shape',
        type: 'pencil',
        stroke: this.shapeProperties.stroke,
        strokeWidth: this.shapeProperties.strokeWidth,
        points: this.tempPathPoints,
        opacity: this.shapeProperties.opacity
      }

      this.tempPathPoints = [];
    }
    
    if(newShape){
      const shapeId = nanoid();
      newShape = {...newShape, id: shapeId}

      this.dispatch(addShape(newShape));
      if(this.socket){
        this.socket.send(JSON.stringify({
          type: 'add-shape',
          payload: {
            roomId: this.roomId,
            shape: newShape
          }
        }));
      }
    }
  }

  public changeSelectedTool(tool: number){
    this.canvas.style.cursor = (tool === 1) ? 'auto' : (tool === 9) ? 'grab' : 'crosshair';

    this.selectedTool = tool;
  }

  public addText(startX: number, startY: number, width: number, text: string){
    const lines = text.split('\n');
    const lineHeight = this.shapeProperties.fontSize * 1.25;

    const height = lines.length * lineHeight;
    let minWidth = 0;

    for(let i = 0; i < lines.length; i++){
      this.ctx.font = `${this.shapeProperties.fontSize}px ${this.shapeProperties.fontFamily}`;
      const textMetrics = this.ctx.measureText(lines[i]);
      const lineWidth = textMetrics.width;

      minWidth = Math.max(minWidth, lineWidth);
    }
    
    const newShape: Text = {
      id: nanoid(),
      type: 'text',
      stroke: this.shapeProperties.stroke,
      fontFamily: this.shapeProperties.fontFamily,
      fontSize: this.shapeProperties.fontSize,
      startX,
      startY,
      width: minWidth,
      minWidth,
      height,
      text,
      opacity: this.shapeProperties.opacity
    }

    this.dispatch(addShape(newShape));
    if(this.socket){
      this.socket.send(JSON.stringify({
        type: 'add-shape',
        payload: {
          roomId: this.roomId,
          shape: newShape
        }
      }));
    }
  }

  public modifyShapes(shapes: Shape[]){
    this.dispatch(modifyShapes(shapes));

    if(this.timerId){
      clearTimeout(this.timerId);
    }

    this.timerId = setTimeout(() => {
      shapes.forEach((shape) => {
        if(this.socket){
          this.socket.send(JSON.stringify({
            type: 'modify-shape',
            payload: {
              roomId: this.roomId,
              shape: shape
            }
          }));
        }
      });
    }, 300);
  }

  private isPointInShape(pointX: number, pointY: number, shape: Rectangle | Diamond | Ellipse | Text | Image | BodyHandle | SelectionBody | CornerHandle | AnchorPoint | ControlPoint | RotationHandle){
    const dpr = window.devicePixelRatio ||  1;
    const path = new Path2D();
    
    pointX = pointX * dpr;
    pointY = pointY * dpr;

    switch(shape.type){
      case "rect":
      case "text":
      case "image":
      case "body":
      case "selection-body":
      case "top-left":
      case "top-right":
      case "bottom-right":
      case "bottom-left":
        path.moveTo(shape.startX, shape.startY);
        path.rect(shape.startX, shape.startY, shape.width, shape.height);
        break;
      case "diamond":
        const centerX = shape.startX + shape.width / 2;
        const centerY = shape.startY + shape.height / 2;
    
        path.moveTo(centerX, shape.startY);
        path.lineTo(shape.startX + shape.width, centerY);
        path.lineTo(centerX, shape.startY + shape.height);
        path.lineTo(shape.startX, centerY);
        break;
      case "ellipse":
        path.moveTo(shape.radiusX, shape.radiusY);
        path.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);
        break;
      case 'anchor-point-start':
      case 'anchor-point-end':
      case 'control-point':
      case 'rotate':
        path.moveTo(shape.x + shape.radius, shape.y + shape.radius);
        path.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        break;
    }

    path.closePath();
    return this.ctx.isPointInPath(path, pointX, pointY);
  }

  private isPointOnShape(pointX: number, pointY: number, shape: Shape | SideHandle | LineHandle){
    const dpr = window.devicePixelRatio ||  1;
    const path = new Path2D();
    
    pointX = pointX * dpr;
    pointY = pointY * dpr;

    switch(shape.type){
      case "rect":
        path.moveTo(shape.startX, shape.startY);
        path.rect(shape.startX, shape.startY, shape.width, shape.height);
        break;
      case "diamond":
        const centerX = shape.startX + shape.width / 2;
        const centerY = shape.startY + shape.height / 2;
    
        path.moveTo(centerX, shape.startY);
        path.lineTo(shape.startX + shape.width, centerY);
        path.lineTo(centerX, shape.startY + shape.height);
        path.lineTo(shape.startX, centerY);
        break;
      case "ellipse":
        path.moveTo(shape.radiusX, shape.radiusY);
        path.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);
        break;
      case "top":
      case "right":
      case "bottom":
      case "left":
        path.moveTo(shape.startX, shape.startY);
        path.lineTo(shape.endX, shape.endY);
        break;
      case "line":
      case "arrow":
      case "line-body":
        path.moveTo(shape.startX, shape.startY);
        if(shape.cp1X && shape.cp1Y){
          const controlX = 2 * shape.cp1X - 0.5 * shape.startX - 0.5 * shape.endX;
          const controlY = 2 * shape.cp1Y - 0.5 * shape.startY - 0.5 * shape.endY;
    
          path.quadraticCurveTo(controlX, controlY, shape.endX, shape.endY);
        }
        else{
          path.lineTo(shape.endX, shape.endY);
        }
        break;
      case "pencil":
        path.moveTo(shape.points[0].x, shape.points[0].y);
        for(let i = 1; i < shape.points.length; i++){
          path.lineTo(shape.points[i].x, shape.points[i].y);
        }
        break;
    }

    path.closePath();

    this.ctx.lineWidth = 15;
    const isHit = this.ctx.isPointInStroke(path, pointX, pointY);
    this.ctx.lineWidth = 1;

    return isHit;
  }

  private selectShapesWithinRect(shapes: Shape[], startX: number, startY: number, endX: number, endY: number){
    this.dispatch(clearSelection());

    const selection: BodyHandle = {
      type: 'body',
      startX: Math.min(startX, endX),
      startY: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    }

    shapes.map((shape) => {
      let isContained = false;

      switch(shape.type){
        case "rect":
        case "diamond":
        case "text":
        case "image":
          isContained = this.isPointInShape(shape.startX, shape.startY, selection) && this.isPointInShape(shape.startX + shape.width, shape.startY + shape.height, selection);
          break;
        case "ellipse":
          const startX = shape.centerX - shape.radiusX, startY = shape.centerY - shape.radiusY, width = 2 * shape.radiusX, height = 2 * shape.radiusY;
    
          isContained = this.isPointInShape(startX, startY, selection) && this.isPointInShape(startX + width, startY + height, selection);
          break;
        case "line":
        case "arrow":
          isContained = this.isPointInShape(shape.startX, shape.startY, selection) && this.isPointInShape(shape.endX, shape.endY, selection);
          
          if(shape.cp1X && shape.cp1Y){
            isContained = isContained && this.isPointInShape(shape.cp1X, shape.cp1Y, selection);
          }
          break;
        case "pencil":
          let [ minmX, maxmX, minmY, maxmY ] = [ shape.points[0].x, shape.points[0].x, shape.points[0].y, shape.points[0].y ];
    
          for(let i = 1; i < shape.points.length; i++){
            minmX = Math.min(minmX, shape.points[i].x);
            maxmX = Math.max(maxmX, shape.points[i].x);
            minmY = Math.min(minmY, shape.points[i].y);
            maxmY = Math.max(maxmY, shape.points[i].y);
          }
    
          isContained = this.isPointInShape(minmX, minmY, selection) && this.isPointInShape(maxmX, maxmY, selection);
          break;
      }

      if(isContained){
        this.dispatch(selectShape(shape.id));
      }
    });
  }

  private getBoundingBoxOfShapes(){
    const selectionBody = this.handles.filter(handle => handle.type === 'selection-body'); 

    return { 
      x: selectionBody[0].startX,
      y: selectionBody[0].startY,
      width: selectionBody[0].width,
      height: selectionBody[0].height,
    };
  }

  public redraw(shapes: Shape[], selectedShapes: string[]){
    this.clearCanvas();

    this.ctx.save();
    this.ctx.translate(this.panOffset.x, this.panOffset.y);

    this.handles = this.getHandles(shapes.filter(shape => selectedShapes.includes(shape.id)));

    const sortedHandles = [...this.handles].sort((a,b) => {
      const getWeight = (type: string) => {
        return (type === 'body' || type ==='selection-body') ? 0 : 1;
      }

      return getWeight(a.type) - getWeight(b.type);
    })

    shapes.map(shape => this.drawShape(shape));
    sortedHandles.map(handle => this.drawHandle(handle));

    this.ctx.restore();
  }

  private drawShape(shape: Shape){
    this.ctx.globalAlpha = shape.opacity / 100;
    if(shape.type !== 'image' && shape.type !== 'text'){
      this.ctx.strokeStyle = shape.stroke;
      this.ctx.lineWidth = shape.strokeWidth;
      if(shape.type !== 'pencil'){
        if(shape.strokeStyle === 1){
          this.ctx.setLineDash([]);
        }
        else if(shape.strokeStyle === 2){
          this.ctx.setLineDash([10, 5]);
        }
        else if(shape.strokeStyle === 3){
          this.ctx.setLineDash([5, 6]);
        }
      }
      else {
        this.ctx.setLineDash([]);
      }
    }

    switch(shape.type){
      case "rect":
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.startX + shape.width, shape.startY);
        this.ctx.lineTo(shape.startX + shape.width, shape.startY + shape.height);
        this.ctx.lineTo(shape.startX, shape.startY + shape.height);
        this.ctx.closePath();

        if(shape.fillStyle !== 'transparent'){
          this.ctx.fillStyle = shape.fillStyle;
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;
      case "diamond":
        const centerX = shape.startX + shape.width / 2;
        const centerY = shape.startY + shape.height / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, shape.startY);
        this.ctx.lineTo(shape.startX + shape.width, centerY);
        this.ctx.lineTo(centerX, shape.startY + shape.height);
        this.ctx.lineTo(shape.startX, centerY);
        this.ctx.closePath();

        if(shape.fillStyle !== 'transparent'){
          this.ctx.fillStyle = shape.fillStyle;
          this.ctx.fill(); 
        }
        this.ctx.stroke();
        break;
      case "ellipse":
        this.ctx.beginPath();
        this.ctx.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);

        if(shape.fillStyle !== 'transparent'){
          this.ctx.fillStyle = shape.fillStyle;
          this.ctx.fill(); 
        }
        this.ctx.stroke();
        break;
      case "line":
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        if(shape.cp1X && shape.cp1Y){
          const controlX = 2 * shape.cp1X - 0.5 * shape.startX - 0.5 * shape.endX;
          const controlY = 2 * shape.cp1Y - 0.5 * shape.startY - 0.5 * shape.endY;

          this.ctx.quadraticCurveTo(controlX, controlY, shape.endX, shape.endY);
        }
        else{
          this.ctx.lineTo(shape.endX, shape.endY);
        }
        this.ctx.stroke();
        break;
      case "arrow":
        const length = Math.sqrt((shape.startX - shape.endX) ** 2 + (shape.startY - shape.endY) ** 2);
        const arrowLength = (length < 10) ? 5 : (length < 20) ? 15 : 20;
        
        let angle: number;

        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        if(shape.cp1X && shape.cp1Y){
          const controlX = 2 * shape.cp1X - 0.5 * shape.startX - 0.5 * shape.endX;
          const controlY = 2 * shape.cp1Y - 0.5 * shape.startY - 0.5 * shape.endY;

          this.ctx.quadraticCurveTo(controlX, controlY, shape.endX, shape.endY);

          angle = Math.atan2(shape.endY - shape.cp1Y, shape.endX - shape.cp1X);
        }
        else{
          this.ctx.lineTo(shape.endX, shape.endY);
          
          angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
        }

        const a1x = shape.endX - arrowLength * Math.cos(angle - Math.PI / 8);
        const a1y = shape.endY - arrowLength * Math.sin(angle - Math.PI / 8);
        
        const a2x = shape.endX - arrowLength * Math.cos(angle + Math.PI / 8);
        const a2y = shape.endY - arrowLength * Math.sin(angle + Math.PI / 8);

        this.ctx.lineTo(a1x, a1y);
        this.ctx.moveTo(shape.endX, shape.endY);
        this.ctx.lineTo(a2x, a2y);
        this.ctx.stroke();
        break;
      case "pencil":
        this.ctx.beginPath();
        this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for(let i = 1; i < shape.points.length; i++){
          this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        this.ctx.stroke();
        break;
      case "text":
        this.ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
        this.ctx.fillStyle = shape.stroke;

        const lines = shape.text.split('\n');
        const lineHeight = shape.fontSize * 1.25;

        for(let i = 0; i < lines.length; i++){
          this.ctx.fillText(lines[i], shape.startX, shape.startY + lineHeight * (i + 1));
        }
        break;
      case 'image':
        const myImage = new Image();
        myImage.src = shape.url;

        myImage.onload = () => {
          this.ctx.drawImage(myImage, shape.startX, shape.startY, shape.width, shape.height);
        }
      }
  }

  private getHandles(shapes: Shape[]){
    if(shapes.length === 0) return [];

    const handleSize = 8;
    const handles: Handle[] = [];

    if(shapes.length === 1){
      if (shapes[0].type === 'rect' || shapes[0].type === 'diamond' || shapes[0].type === 'text' || shapes[0].type === 'image') {
        const { startX, startY, width, height } = shapes[0];

        /* Corner Handles */
        handles.push({ startX: startX - handleSize, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-left' });
        handles.push({ startX: startX + width, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-right' });
        handles.push({ startX: startX - handleSize, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-left' });
        handles.push({ startX: startX + width, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-right' });

        /* Side Handles */
        handles.push({ startX, startY, endX: startX + width, endY: startY, type: 'top' });
        handles.push({ startX: startX + width, startY, endX: startX + width, endY: startY + height, type: 'right' });
        handles.push({ startX, startY: startY + height, endX: startX + width, endY: startY + height, type: 'bottom' });
        handles.push({ startX, startY, endX: startX, endY: startY + height, type: 'left' });

        /* Body Handle */
        handles.push({ startX: startX - handleSize / 2, startY: startY - handleSize / 2, width: width + handleSize , height: height + handleSize, type: 'body' });

        /* Rotation Handle */
        const rotateHandleX = startX + width / 2;
        const rotateHandleY = startY - 20;

        handles.push({ x: rotateHandleX, y: rotateHandleY, radius: handleSize - 4, type: 'rotate' });
      }
      else if(shapes[0].type === 'ellipse'){
        const { centerX, centerY, radiusX, radiusY } = shapes[0];
        const startX = centerX - radiusX, startY = centerY - radiusY, width = 2 * radiusX, height = 2 * radiusY;

        /* Corner Handles */
        handles.push({ startX: startX - handleSize, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-left' });
        handles.push({ startX: startX + width, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-right' });
        handles.push({ startX: startX - handleSize, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-left' });
        handles.push({ startX: startX + width, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-right' });

        /* Side Handles */
        handles.push({ startX: startX, startY: startY, endX: startX + width, endY: startY, type: 'top' });
        handles.push({ startX: startX + width, startY: startY, endX: startX + width, endY: startY + height, type: 'right' });
        handles.push({ startX: startX, startY: startY + height, endX: startX + width, endY: startY + height, type: 'bottom' });
        handles.push({ startX: startX, startY: startY, endX: startX, endY: startY + height, type: 'left' });

        /* Body Handle */
        handles.push({ 
          startX: startX - handleSize / 2,
          startY: startY - handleSize / 2, 
          width: width + handleSize, 
          height: height + handleSize, 
          type: 'body' 
        });

        /* Rotation Handle */
        const rotateHandleX = startX + width/2;
        const rotateHandleY = startY - 20;

        handles.push({ x: rotateHandleX, y: rotateHandleY, radius: handleSize - 4, type: 'rotate' });
      }
      else if(shapes[0].type === 'line' || shapes[0].type === 'arrow'){
        const centerX = (shapes[0].startX + shapes[0].endX) / 2, centerY =  (shapes[0].startY + shapes[0].endY) / 2; 

        handles.push({ x: shapes[0].startX, y: shapes[0].startY, radius: handleSize - 3, type: 'anchor-point-start' });
        handles.push({ x: shapes[0].endX, y: shapes[0].endY, radius: handleSize - 3, type: 'anchor-point-end' });
        
        if(shapes[0].cp1X && shapes[0].cp1Y){
          const startX = Math.min(shapes[0].startX, shapes[0].cp1X, shapes[0].endX), startY = Math.min(shapes[0].startY, shapes[0].cp1Y - 20, shapes[0].endY);
          const endX = Math.max(shapes[0].startX, shapes[0].cp1X, shapes[0].endX), endY = Math.max(shapes[0].startY, shapes[0].cp1Y + 20, shapes[0].endY);

          handles.push({ x: shapes[0].cp1X, y: shapes[0].cp1Y, radius: handleSize - 4, type: 'control-point' });
          
          /* Corner Handles */
          handles.push({ startX: startX - 10, startY: startY - 10, width: handleSize, height: handleSize, type: 'top-left' });
          handles.push({ startX: endX - handleSize + 10, startY: startY - 10, width: handleSize, height: handleSize, type: 'top-right' });
          handles.push({ startX: endX - handleSize + 10, startY: endY - handleSize + 10, width: handleSize, height: handleSize, type: 'bottom-right' });
          handles.push({ startX: startX - 10, startY: endY - handleSize + 10, width: handleSize, height: handleSize, type: 'bottom-left' });

          /* Side Handles */
          handles.push({ startX, startY, endX, endY: startY, type: 'top' });
          handles.push({ startX: endX, startY, endX, endY, type: 'right' });
          handles.push({ startX, startY: endY, endX, endY, type: 'bottom' });
          handles.push({ startX, startY, endX: startX, endY, type: 'left' });

          /* Body Handle */
          handles.push({ startX, startY,  width: endX - startX, height: endY - startY, type: 'body' });

          /* Rotation Handle */
          const rotateHandleX = (startX + endX) / 2;
          const rotateHandleY = startY - 20;

          handles.push({ x: rotateHandleX, y: rotateHandleY, radius: handleSize - 4, type: 'rotate' });
        }
        else{
          handles.push({ x: centerX, y: centerY, radius: handleSize - 4, type: 'control-point' });
          handles.push({ startX: shapes[0].startX, startY: shapes[0].startY, endX: shapes[0].endX, endY: shapes[0].endY, type: 'line-body' });
        }
      }
      else if(shapes[0].type === 'pencil'){
        let [ minX, maxX, minY, maxY ] = [ shapes[0].points[0].x, shapes[0].points[0].x, shapes[0].points[0].y, shapes[0].points[0].y ];

        for(let i = 1; i < shapes[0].points.length; i++){
          minX = Math.min(minX, shapes[0].points[i].x);
          maxX = Math.max(maxX, shapes[0].points[i].x);
          minY = Math.min(minY, shapes[0].points[i].y);
          maxY = Math.max(maxY, shapes[0].points[i].y);
        }

        const startX = minX, startY = minY, width = maxX - minX, height = maxY - minY;
        
        /* Corner Handles */
        handles.push({ startX: startX - handleSize, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-left' });
        handles.push({ startX: startX + width, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-right' });
        handles.push({ startX: startX - handleSize, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-left' });
        handles.push({ startX: startX + width, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-right' });

        /* Side Handles */
        handles.push({ startX, startY, endX: maxX, endY: startY, type: 'top' });
        handles.push({ startX: maxX, startY, endX: maxX, endY: maxY, type: 'right' });
        handles.push({ startX, startY: maxY, endX: maxX, endY: maxY, type: 'bottom' });
        handles.push({ startX, startY, endX: startX, endY: maxY, type: 'left' });

        /* Body Handle */
        handles.push({ startX: minX - handleSize / 2, startY: minY - handleSize / 2, width: width + handleSize , height: height + handleSize, type: 'body' });

        /* Rotation Handle */
        const rotateHandleX = startX + width/2;
        const rotateHandleY = startY - 20;

        handles.push({ x: rotateHandleX, y: rotateHandleY, radius: handleSize - 3, type: 'rotate' });
      }
    }
    else{
      let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];

      shapes.map((shape) => {
        if (shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'text' || shape.type === 'image') {
          const { startX, startY, width, height } = shape;
          
          handles.push({ startX: startX - handleSize / 2, startY: startY - handleSize / 2, width: width + handleSize , height: height + handleSize, type: 'body' });

          minX = Math.min(minX, startX);
          maxX = Math.max(maxX, startX + width);
          minY = Math.min(minY, startY);
          maxY = Math.max(maxY, startY + height);
        }
        else if(shape.type === 'ellipse'){
          const { centerX, centerY, radiusX, radiusY } = shape;
          const startX = centerX - radiusX, startY = centerY - radiusY, width = 2 * radiusX, height = 2 * radiusY;

          handles.push({ 
            startX: startX - handleSize / 2,
            startY: startY - handleSize / 2, 
            width: width + handleSize, 
            height: height + handleSize, 
            type: 'body' 
          });

          minX = Math.min(minX, startX);
          maxX = Math.max(maxX, startX + width);
          minY = Math.min(minY, startY);
          maxY = Math.max(maxY, startY+ height);
        }
        else if(shape.type === 'line' || shape.type === 'arrow'){
          let startX = Math.min(shape.startX, shape.endX); 
          let startY = Math.min(shape.startY, shape.endY);
          let endX = Math.max(shape.startX, shape.endX);
          let endY = Math.max(shape.startY, shape.endY);

          if(shape.cp1X && shape.cp1Y){
            startX = Math.min(startX, shape.cp1X);
            startY = Math.min(startY, shape.cp1Y - 20);
            endX = Math.max(endX, shape.cp1X);
            endY = Math.max(endY, shape.cp1Y + 20);
          }

          handles.push({ startX, startY,  width: endX - startX, height: endY - startY, type: 'body' });

          minX = Math.min(minX, startX);
          maxX = Math.max(maxX, endX);
          minY = Math.min(minY, startY);
          maxY = Math.max(maxY, endY);
        }
        else if(shape.type === 'pencil'){
          let [ minmX, maxmX, minmY, maxmY ] = [ shape.points[0].x, shape.points[0].x, shape.points[0].y, shape.points[0].y ];

          for(let i = 1; i < shape.points.length; i++){
            minmX = Math.min(minmX, shape.points[i].x);
            maxmX = Math.max(maxmX, shape.points[i].x);
            minmY = Math.min(minmY, shape.points[i].y);
            maxmY = Math.max(maxmY, shape.points[i].y);
          }

          handles.push({ startX: minmX - handleSize / 2, startY: minmY - handleSize / 2, width: maxmX - minmX + handleSize , height: maxmY - minmY + handleSize, type: 'body' });

          minX = Math.min(minX, minmX);
          maxX = Math.max(maxX, maxmX);
          minY = Math.min(minY, minmY);
          maxY = Math.max(maxY, maxmY);
        }
      });

      const startX = minX, startY = minY, width = maxX - minX, height = maxY - minY; 
      
      /* Corner Handles */
      handles.push({ startX: startX - handleSize, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-left' });
      handles.push({ startX: startX + width, startY: startY - handleSize, width: handleSize, height: handleSize, type: 'top-right' });
      handles.push({ startX: startX - handleSize, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-left' });
      handles.push({ startX: startX + width, startY: startY + height, width: handleSize, height: handleSize, type: 'bottom-right' });

      /* Side Handles */
      // handles.push({ startX, startY, endX: startX + width, endY: startY, type: 'top' });
      // handles.push({ startX: startX + width, startY, endX: startX + width, endY: startY + height, type: 'right' });
      // handles.push({ startX, startY: startY + height, endX: startX + width, endY: startY + height, type: 'bottom' });
      // handles.push({ startX, startY, endX: startX, endY: startY + height, type: 'left' });

      /* Body Handle */
      handles.push({ startX: startX - handleSize / 2, startY: startY - handleSize / 2, width: width + handleSize , height: height + handleSize, type: 'selection-body' });

      /* Rotation Handle */
      const rotateHandleX = startX + width / 2;
      const rotateHandleY = startY - 20;

      handles.push({ x: rotateHandleX, y: rotateHandleY, radius: handleSize - 4, type: 'rotate' });
    }

    return handles;
  }

  private drawHandle(handle: Handle){
    this.ctx.strokeStyle = "rgb(96, 80, 220)";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;

    switch(handle.type){
      case "body":
        this.ctx.strokeRect(handle.startX, handle.startY, handle.width, handle.height);
        break;
      case "selection-body":
        this.ctx.setLineDash([2, 2]);
        this.ctx.strokeRect(handle.startX, handle.startY, handle.width, handle.height);
        this.ctx.setLineDash([]);
        break;
      case "top-left":
      case "top-right":
      case "bottom-right":
      case "bottom-left":
        this.ctx.fillStyle = "rgb(255, 255, 255)";
        this.ctx.fillRect(handle.startX, handle.startY, handle.width, handle.height);
        this.ctx.strokeRect(handle.startX, handle.startY, handle.width, handle.height);
        break;
      case "control-point":
        this.ctx.fillStyle = "rgb(204, 204, 255, 0.60)";
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, handle.radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.fill();
        break;
      case "anchor-point-start":
      case "anchor-point-end":
      case "rotate":
        this.ctx.fillStyle = "rgb(255, 255, 255)";
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, 4, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.fill();
        break;
    }
  }
}