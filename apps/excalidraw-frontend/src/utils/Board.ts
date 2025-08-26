import { changeSelectedTool } from "@/lib/features/board/boardSlice";
import { Rectangle, Diamond, Ellipse, Text, Shape, CornerHandle, BodyHandle, LineHandle, Handle, AnchorPoint, ControlPoint, RotationHandle, SideHandle } from "@/types";
import type { AppDispatch } from "@/lib/store";

export class Board {
  private canvas: HTMLCanvasElement;
  private dispatch: AppDispatch; 
  private ctx: CanvasRenderingContext2D;
  private panOffset: {x: number; y: number};
  private selectedTool: number;
  private lockTool: boolean;
  private shiftKeyDown: boolean;
  private controlKeyDown: boolean;
  private startX = 0;
  private startY = 0;
  private previousX = 0;
  private previousY = 0;
  private clicked: boolean;
  private totalShapes: number;
  private selectedShapes: number[];
  private existingShapes: Shape[];
  private handles: Handle[];
  private activeHandle: { type: string } | null = null;
  private tempPathPoints: { x: number, y: number }[] = [];

  constructor(canvas: HTMLCanvasElement, dispatch: AppDispatch){
    this.canvas = canvas;
    this.dispatch = dispatch;
    
    canvas.width = 2000;
    canvas.height = 1000;
    
    this.ctx = canvas.getContext("2d")!;
    this.panOffset = {x: 0, y: 0};
    this.clicked = false;
    this.selectedShapes = [];
    this.existingShapes = [];
    this.handles = [];
    this.totalShapes = 0;
    this.selectedTool = 1;
    this.shiftKeyDown = false;
    this.controlKeyDown = false;
    this.lockTool = false;

    this.init();
    this.initMouseHandlers();
    this.initKeyboardHandlers();
  }

  async init(){
    const dpr = window.devicePixelRatio || 1;
    
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.scale(dpr, dpr);

    this.redraw();
  }

  private initMouseHandlers(){
    this.canvas.addEventListener("mousedown", (e) => {
      this.clicked = true;
      this.startX = this.previousX = e.clientX;
      this.startY = this.previousY = e.clientY;

      if(this.selectedTool === 1){
        if(this.handles.length !== 0){
          const clickedHandle = this.handles.find((handle) => {
            if(handle.type === 'top-left' || handle.type === 'top-right' || handle.type === 'bottom-left' || handle.type === 'bottom-right'){
              return this.isPointInRectangle(e.clientX, e.clientY, handle);
            }
            else if(handle.type === 'top' || handle.type === 'left' || handle.type === 'bottom' || handle.type === 'right'){
              return this.isPointOnPath(e.clientX, e.clientY, handle);
            }
            else if(handle.type === 'rotate' || handle.type === 'anchor-point-start' || handle.type === 'anchor-point-end' || handle.type === 'control-point'){
              return this.isPointInCircle(e.clientX, e.clientY, handle);
            }
            else if(handle.type === 'selection-body'){
              return this.isPointInRectangle(e.clientX, e.clientY, handle);
            }
            else if(handle.type === 'body'){
              return this.isPointInRectangle(e.clientX, e.clientY, handle);
            }
            else if(handle.type === 'line-body'){
              return this.isPointOnPath(e.clientX, e.clientY, handle);
            }
          });

          if(clickedHandle){
            this.activeHandle = { type: clickedHandle.type };
          }
          else {
            if(this.shiftKeyDown){
              this.existingShapes.map(shape => {
                if(this.isPointOnPath(e.clientX, e.clientY, shape)){
                  this.selectedShapes.push(shape.id);
                }
              });
              this.getHandles();
            }
            else{
              this.handles = [];
              this.selectedShapes = [];
            }
          }
        }
        else{
          this.existingShapes.map(shape => {
            if(shape.type === 'text'){
              if(this.isPointInRectangle(e.clientX, e.clientY, shape)){
                this.selectedShapes = [shape.id];
              }
            }
            else if(this.isPointOnPath(e.clientX, e.clientY, shape)){
              this.selectedShapes = [shape.id];
            }
          });
          this.getHandles();
        }
        
        this.redraw();
      }
      else if(this.selectedTool === 7){
        this.tempPathPoints = [{ x: e.clientX, y: e.clientY }];
      }
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if(this.clicked){
        this.redraw();

        if(this.selectedTool === 1){
          if(this.selectedShapes.length === 0){
            this.ctx.strokeStyle = "rgb(96, 80, 220)";
            this.ctx.fillStyle = "rgba(204, 204, 255, 0.20)";
            this.ctx.strokeRect(this.startX + 0.5, this.startY + 0.5, e.clientX - this.startX, e.clientY - this.startY);
            this.ctx.fillRect(this.startX + 0.5, this.startY + 0.5, e.clientX - this.startX, e.clientY - this.startY);
          }
          else{
            const dx = e.clientX - this.previousX, dy = e.clientY - this.previousY;
            const selectedShapes: Shape[] = this.existingShapes.filter(shape => this.selectedShapes.includes(shape.id));

            if(this.activeHandle){
              if(this.activeHandle.type === 'top-left'){
                if(selectedShapes.length == 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.startX += dx;
                    shape.startY += dy;
                    shape.width -= dx;
                    shape.height -= dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx / 2;
                    shape.centerY += dy / 2;
                    shape.radiusX -= dx / 2;
                    shape.radiusY -= dy / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                    const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                    const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                    const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                    
                    const newWidth = width - dx;
                    const newHeight = height - dy;

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
                }
              }
              else if(this.activeHandle.type === 'top-right'){
                if(selectedShapes.length == 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.startY += dy;
                    shape.width += dx;
                    shape.height -= dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx / 2;
                    shape.centerY += dy / 2;
                    shape.radiusX += dx / 2;
                    shape.radiusY -= dy / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                    const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                    const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                    const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                    
                    const newWidth = width + dx;
                    const newHeight = height - dy;

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
                }
              }
              else if(this.activeHandle.type === 'bottom-right'){
                if(selectedShapes.length === 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.width += dx;
                    shape.height += dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx / 2; 
                    shape.centerY += dy / 2; 
                    shape.radiusX += dx / 2;
                    shape.radiusY += dy / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                    const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                    const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                    const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                    
                    const newWidth = width + dx;
                    const newHeight = height + dy;

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
                }
              }
              else if(this.activeHandle.type === 'bottom-left'){
                if(selectedShapes.length === 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.startX += dx;
                    shape.width -= dx;
                    shape.height += dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx / 2;
                    shape.centerY += dy / 2;
                    shape.radiusX -= dx / 2;
                    shape.radiusY += dy / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                    const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                    const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                    const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                    
                    const newWidth = width - dx;
                    const newHeight = height + dy;

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
                }
              }
              else if(this.activeHandle.type === 'top'){
                if(selectedShapes.length === 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.startY += dy;
                    shape.height -= dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerY += dy / 2;
                    shape.radiusY -= dy / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                    const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                    
                    const newHeight = height - dy;

                    const scaleY = newHeight / height;

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
                }
              }
              else if(this.activeHandle.type === 'right'){
                if(selectedShapes.length === 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.width += dx;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx / 2; 
                    shape.radiusX += dx / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                    const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                    
                    const newWidth = width + dx;

                    const scaleX = newWidth / width;

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
                }
              }
              else if(this.activeHandle.type === 'bottom'){
                if(selectedShapes.length === 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.height += dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerY += dy / 2; 
                    shape.radiusY += dy / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minY = Math.min(shape.startY, shape.endY, shape.cp1Y || Infinity);
                    const height = Math.max(shape.startY, shape.endY, shape.cp1Y || -Infinity) - minY;
                    
                    const newHeight = height + dy;

                    const scaleY = newHeight / height;

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
                }
              }
              else if(this.activeHandle.type === 'left'){
                if(selectedShapes.length === 1){
                  const shape = selectedShapes[0];
                  if(shape.type === 'rect' || shape.type === 'diamond'){
                    shape.startX += dx;
                    shape.width -= dx;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx / 2;
                    shape.radiusX -= dx / 2;
                  }
                  else if(shape.type === 'line' || shape.type === 'arrow'){
                    const minX = Math.min(shape.startX, shape.endX, shape.cp1X || Infinity);
                    const width = Math.max(shape.startX, shape.endX, shape.cp1X || -Infinity) - minX;
                    
                    const newWidth = width - dx;

                    const scaleX = newWidth / width;

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
                }
              }
              else if(this.activeHandle.type === 'selection-body'){
                selectedShapes.map((shape) => {
                  if(shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'text'){
                    shape.startX += dx;
                    shape.startY += dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx;
                    shape.centerY += dy;
                  }
                  else if((shape.type === 'line' || shape.type === 'arrow')){
                    shape.startX += dx;
                    shape.startY += dy;
                    if(shape.cp1X && shape.cp1Y){
                      shape.cp1X += dx;
                      shape.cp1Y += dy;
                    }
                    shape.endX += dx;
                    shape.endY += dy;
                  }
                  else if(shape.type === 'pencil'){
                    for(let i = 0; i < shape.points.length; i++){
                      shape.points[i].x += dx;
                      shape.points[i].y += dy;
                    }
                  }
                });
              }
              else if(this.activeHandle.type === 'body'){
                selectedShapes.map((shape) => {
                  if(shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'text'){
                    shape.startX += dx;
                    shape.startY += dy;
                  }
                  else if(shape.type === 'ellipse'){
                    shape.centerX += dx;
                    shape.centerY += dy;
                  }
                  else if((shape.type === 'line' || shape.type === 'arrow')){
                    shape.startX += dx;
                    shape.startY += dy;
                    if(shape.cp1X && shape.cp1Y){
                      shape.cp1X += dx;
                      shape.cp1Y += dy;
                    }
                    shape.endX += dx;
                    shape.endY += dy;
                  }
                  else if(shape.type === 'pencil'){
                    for(let i = 0; i < shape.points.length; i++){
                      shape.points[i].x += dx;
                      shape.points[i].y += dy;
                    }
                  }
                });
              }
              else if(this.activeHandle.type === 'line-body'){
                selectedShapes.map((shape) => {
                  if((shape.type === 'line' || shape.type === 'arrow')){
                    shape.startX += dx;
                    shape.startY += dy;
                    if(shape.cp1X && shape.cp1Y){
                      shape.cp1X += dx;
                      shape.cp1Y += dy;
                    }
                    shape.endX += dx;
                    shape.endY += dy;
                  }
                })
              }
              else if(this.activeHandle.type === 'anchor-point-start'){
                selectedShapes.map((shape) => {
                  if(shape.type === 'line' || shape.type === 'arrow'){
                    shape.startX += dx;
                    shape.startY += dy;
                  }
                });
              }
              else if(this.activeHandle.type === 'anchor-point-end'){
                selectedShapes.map((shape) => {
                  if(shape.type === 'line' || shape.type === 'arrow'){
                    shape.endX += dx;
                    shape.endY += dy;
                  }
                });
              }
              else if(this.activeHandle.type === 'control-point'){
                selectedShapes.map((shape) => {
                  if(shape.type === 'line' || shape.type === 'arrow'){
                    if(shape.cp1X && shape.cp1Y){
                      shape.cp1X += dx;
                      shape.cp1Y += dy;
                    }
                    else{
                      const centerX = (shape.startX + shape.endX) / 2, centerY = (shape.startY + shape.endY) / 2;
                      shape.cp1X = centerX + dx;
                      shape.cp1Y = centerY + dy;
                    }
                  }
                });
              }

              this.getHandles();
            }
            
            this.previousX = e.clientX;
            this.previousY = e.clientY;
          }
        }
        else if(this.selectedTool === 2){
          let width = e.clientX - this.startX;
          let height = e.clientY - this.startY;

          if(this.shiftKeyDown){
            const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
            const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

            width = updatedWidth;
            height = updatedHeight;
          }

          this.ctx.strokeStyle = "rgba(0, 0, 0)";
          this.ctx.strokeRect(this.startX, this.startY, width, height);
        }
        else if(this.selectedTool === 3){
          let width = e.clientX - this.startX;
          let height = e.clientY - this.startY;

          if(this.shiftKeyDown){
            const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
            const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

            width = updatedWidth;
            height = updatedHeight;
          }

          const centerX = this.startX + width / 2;
          const centerY = this.startY + height / 2;

          this.ctx.beginPath();
          this.ctx.moveTo(centerX, this.startY);
          this.ctx.lineTo(this.startX + width, centerY);
          this.ctx.lineTo(centerX, this.startY + height);
          this.ctx.lineTo(this.startX, centerY);
          this.ctx.closePath();

          this.ctx.strokeStyle = "rgba(0, 0, 0)";
          this.ctx.stroke();
        }
        else if(this.selectedTool === 4){
          let radiusX = Math.floor((e.clientX - this.startX) / 2);
          let radiusY = Math.floor((e.clientY - this.startY) / 2);

          if(this.shiftKeyDown){
            const updatedRadiusX = (radiusX > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));
            const updatedRadiusY = (radiusY > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));

            radiusX = updatedRadiusX;
            radiusY = updatedRadiusY;
          }

          this.ctx.beginPath();
          this.ctx.ellipse(this.startX + radiusX + 0.5, this.startY + radiusY + 0.5, Math.abs(radiusX), Math.abs(radiusY), 0, 0, 2 * Math.PI);
          this.ctx.stroke();
        }
        else if(this.selectedTool === 5){
          const length = Math.sqrt((this.startX - e.clientX) ** 2 + (this.startY - e.clientY) ** 2);

          const arrowLength = (length < 10) ? 5 : (length < 20) ? 15 : 20;

          const angle = Math.atan2(e.clientY - this.startY, e.clientX - this.startX);

          this.ctx.beginPath();
          this.ctx.moveTo(this.startX, this.startY);
          this.ctx.lineTo(e.clientX, e.clientY);

          const a1x = e.clientX - arrowLength * Math.cos(angle - Math.PI / 8);
          const a1y = e.clientY - arrowLength * Math.sin(angle - Math.PI / 8);
        
          const a2x = e.clientX - arrowLength * Math.cos(angle + Math.PI / 8);
          const a2y = e.clientY - arrowLength * Math.sin(angle + Math.PI / 8);

          this.ctx.lineTo(a1x, a1y);
          this.ctx.moveTo(e.clientX, e.clientY);
          this.ctx.lineTo(a2x, a2y);
          this.ctx.stroke();
        }
        else if(this.selectedTool === 6){
          this.ctx.beginPath();
          this.ctx.moveTo(this.startX, this.startY)
          this.ctx.lineTo(e.clientX, e.clientY);
          this.ctx.stroke();
        }
        else if(this.selectedTool === 7){
          this.tempPathPoints.push({ x: e.clientX, y: e.clientY });
          
          this.ctx.beginPath();
          this.ctx.lineWidth = 2;
          this.ctx.moveTo(this.tempPathPoints[0].x, this.tempPathPoints[0].y);
          for(let i = 1; i < this.tempPathPoints.length; i++){
            this.ctx.lineTo(this.tempPathPoints[i].x, this.tempPathPoints[i].y);
          }
          this.ctx.stroke();
          this.ctx.lineWidth = 1;
        }
        else if(this.selectedTool === 0){
          this.existingShapes = this.existingShapes.filter((shape) => {
            if(shape.type === 'text'){
              return !this.isPointInRectangle(e.clientX, e.clientY, shape);
            }
            else{
              return !this.isPointOnPath(e.clientX, e.clientY, shape);
            }
          })
        }
      }
      else{
        if(this.selectedTool === 1){
          let cursor = 'auto';
          this.existingShapes.map((shape) => {
            if(this.isPointOnPath(e.clientX, e.clientY, shape)){
              cursor = 'move';
            }
          });

          for(let i = 0; i < this.handles.length; i++){
            const handle = this.handles[i];
            if(handle.type === 'top-left' && this.isPointInRectangle(e.clientX, e.clientY, handle)){
              cursor = 'nw-resize';
              break;
            }
            else if(handle.type === 'top-right' && this.isPointInRectangle(e.clientX, e.clientY, handle)){
              cursor = 'ne-resize';
              break;
            }
            else if(handle.type === 'bottom-right' && this.isPointInRectangle(e.clientX, e.clientY, handle)){
              cursor = 'se-resize';
              break;
            }
            else if(handle.type === 'bottom-left' && this.isPointInRectangle(e.clientX, e.clientY, handle)){
              cursor = 'sw-resize';
              break;
            }
            else if(handle.type === 'top' && this.isPointOnPath(e.clientX, e.clientY, handle)){
              cursor = "n-resize";
              break;
            }
            else if(handle.type === 'right' && this.isPointOnPath(e.clientX, e.clientY, handle)){
              cursor = "e-resize";
              break;
            }
            else if(handle.type === 'bottom' && this.isPointOnPath(e.clientX, e.clientY, handle)){
              cursor = "s-resize";
              break;
            }
            else if(handle.type === 'left' && this.isPointOnPath(e.clientX, e.clientY, handle)){
              cursor = "w-resize";
              break;
            }
            else if((handle.type === 'anchor-point-start' || handle.type === 'anchor-point-end' || handle.type === 'control-point') && this.isPointInCircle(e.clientX, e.clientY, handle)){
              cursor = 'pointer';
              break;
            }
            else if(handle.type === 'selection-body' && this.isPointInRectangle(e.clientX, e.clientY, handle)){
              cursor = 'move';
              break;
            }
            else if(handle.type === 'body' && this.isPointInRectangle(e.clientX, e.clientY, handle)){
              cursor = 'move';
              break;
            }
            else if(handle.type === 'rotate' && this.isPointInCircle(e.clientX, e.clientY, handle)){
              cursor = 'grab';
              break;
            }
          }

          this.canvas.style.cursor = cursor;
        }
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      this.clicked = false;
      let newShape: Shape | null = null;
      
      if(this.selectedTool === 1){
        this.activeHandle = null;

        if(this.selectedShapes.length === 0){
          const area = Math.abs((e.clientX - this.startX) * (e.clientY - this.startY));
  
          if(area > 100){
            this.selectShapesWithinRect(this.startX, this.startY, e.clientX, e.clientY);
            this.getHandles();
          }
        }
      }
      else if(this.selectedTool === 2){
        const startX = Math.min(this.startX, e.clientX), startY = Math.min(this.startY, e.clientY);
        let width = Math.abs(e.clientX - this.startX), height = Math.abs(e.clientY - this.startY);

        if(this.shiftKeyDown){
          const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
          const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

          width = updatedWidth;
          height = updatedHeight;
        }

        newShape ={
          id: this.totalShapes + 1,
          type: "rect",
          startX,
          startY,
          width,
          height
        }
      }
      else if(this.selectedTool === 3){
        const startX = Math.min(this.startX, e.clientX), startY = Math.min(this.startY, e.clientY);
        let width = Math.abs(e.clientX - this.startX), height = Math.abs(e.clientY - this.startY);

        if(this.shiftKeyDown){
          const updatedWidth = (width > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));
          const updatedHeight = (height > 0) ? Math.abs(Math.min(width, height)) : -1 * Math.abs(Math.min(width, height));

          width = updatedWidth;
          height = updatedHeight;
        }

        newShape ={
          id: this.totalShapes + 1,
          type: "diamond",
          startX,
          startY,
          width,
          height
        }
      }
      else if (this.selectedTool === 4){
        let radiusX = Math.floor((e.clientX - this.startX) / 2);
        let radiusY = Math.floor((e.clientY - this.startY) / 2);

        if(this.shiftKeyDown){
          const updatedRadiusX = (radiusX > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));
          const updatedRadiusY = (radiusY > 0) ? Math.abs(Math.min(radiusX, radiusY)) : -1 * Math.abs(Math.min(radiusX, radiusY));

          radiusX = updatedRadiusX;
          radiusY = updatedRadiusY;
        }

        newShape = {
          id: this.totalShapes + 1,
          type: "ellipse",
          centerX: this.startX + radiusX,
          centerY: this.startY + radiusY,
          radiusX: Math.abs(radiusX),
          radiusY: Math.abs(radiusY)
        }
      }
      else if(this.selectedTool === 5){
        newShape = {
          id: this.totalShapes + 1,
          type: "arrow",
          startX: this.startX,
          startY: this.startY,
          endX: e.clientX,
          endY: e.clientY
        }
      }
      else if(this.selectedTool === 6){
        newShape = {
          id: this.totalShapes + 1,
          type: "line",
          startX: this.startX,
          startY: this.startY,
          endX: e.clientX,
          endY: e.clientY
        }
      }
      else if(this.selectedTool === 7){
        newShape = {
          id: this.totalShapes + 1,
          type: 'pencil',
          points: this.tempPathPoints
        }

        this.tempPathPoints = [];
      }
      
      if(newShape){
        this.existingShapes.push(newShape);
        this.totalShapes = this.totalShapes + 1;

        if(!this.lockTool && this.selectedTool !== 7  && this.selectedTool !== 8){
          this.selectedTool = 1;
          this.dispatch(changeSelectedTool(1));

          this.selectedShapes = [this.totalShapes];
          this.getHandles();
        }
      }
      this.redraw();
    });
  }

  private initKeyboardHandlers(){
    document.addEventListener('keydown', async (e) => {
      if(e.key === 'Shift' && this.shiftKeyDown === false){
        this.shiftKeyDown = true;
      }
      else if(e.key === 'Control'){
        this.controlKeyDown = true;
      }
      else if(e.key === 'Delete'){
        if(this.selectedShapes.length !== 0){
          this.existingShapes = this.existingShapes.filter((shape) => !this.selectedShapes.includes(shape.id));
          
          this.selectedShapes = [];
          this.handles = [];
          this.redraw();
        }
      }
      else if(this.controlKeyDown){
        if(e.key === 'c'){
          const selectedShapes = this.existingShapes.filter((shape) => {
            return this.selectedShapes.includes(shape.id);
          });

          navigator.clipboard.writeText(JSON.stringify(selectedShapes));
        }
        else if(e.key === 'x'){
          const selectedShapes = this.existingShapes.filter((shape) => {
            return this.selectedShapes.includes(shape.id);
          });

          navigator.clipboard.writeText(JSON.stringify(selectedShapes));

          this.existingShapes = this.existingShapes.filter((shape) => {
            return !this.selectedShapes.includes(shape.id);
          });

          this.handles = [];
          this.selectedShapes = [];
          this.redraw();
        }
        else if(e.key === 'v'){
          const shapes = await navigator.clipboard.readText();
          try{
            const selectedShapes = JSON.parse(shapes);
            this.selectedShapes = [];

            selectedShapes.map((shape: Shape) => {
              this.existingShapes.push({
                ...shape,
                id: this.totalShapes + 1
              });
    
              this.totalShapes += 1;
              this.selectedShapes.push(shape.id);
              this.getHandles();
            });
            this.redraw();

          } catch(err) {
            console.log(err);
          }
        }
      }

    });

    document.addEventListener('keyup', (e) => {
      if(e.key === 'Shift'){
        this.shiftKeyDown = false;
      }
      else if(e.key === 'Control'){
        this.controlKeyDown = false;
      }
    });
  }

  public changeSelectedTool(tool: number){
    this.canvas.style.cursor = (tool === 1) ? 'auto' : (tool === 9) ? 'grab' : 'crosshair';

    if(this.selectedTool !== tool){
      this.selectedTool = tool;
      this.handles = [];
    }
    
    this.redraw();
  }

  public setLockTool(isLocked: boolean) {
    this.lockTool = isLocked;
  }

  private isPointInRectangle(pointX: number, pointY: number, rect: {startX: number, startY: number, width: number, height: number} | Rectangle | Diamond | Text | BodyHandle | CornerHandle) {
    const left = Math.min(rect.startX, rect.startX + rect.width);
    const right = Math.max(rect.startX, rect.startX + rect.width);
    const top = Math.min(rect.startY, rect.startY + rect.height);
    const bottom = Math.max(rect.startY, rect.startY + rect.height);

    return pointX > left && pointX < right && pointY > top && pointY < bottom;
  }
  

  private isPointInCircle(pointX: number, pointY: number, shape: AnchorPoint | ControlPoint | RotationHandle){
    return (pointX - shape.x) ** 2  + (pointY - shape.y) ** 2 - 25 <= 0;
  }

  private isPointInEllipse(pointX: number, pointY: number, shape: Ellipse){
    const dx = pointX - shape.centerX;
    const dy = pointY - shape.centerY;

    return (dx ** 2 / shape.radiusX ** 2) + (dy ** 2 / shape.radiusY ** 2) <= 1;
  }

  private isPointOnPath(pointX: number, pointY: number, shape: Shape | SideHandle | LineHandle){
    const dpr = window.devicePixelRatio ||  1;
    const path = new Path2D();
    
    pointX = pointX * dpr;
    pointY = pointY * dpr;

    if(shape.type === 'rect'){
      path.moveTo(shape.startX, shape.startY);
      path.rect(shape.startX, shape.startY, shape.width, shape.height);
      path.closePath();
    }
    else if(shape.type === 'diamond'){
      const centerX = shape.startX + shape.width / 2;
      const centerY = shape.startY + shape.height / 2;

      path.moveTo(centerX, shape.startY);
      path.lineTo(shape.startX + shape.width, centerY);
      path.lineTo(centerX, shape.startY + shape.height);
      path.lineTo(shape.startX, centerY);
      path.closePath();
    }
    else if (shape.type === 'ellipse'){
      path.moveTo(shape.radiusX, shape.radiusY);
      path.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);
      path.closePath();
    }
    else if(shape.type === 'top' || shape.type === 'right' || shape.type === 'bottom' || shape.type === 'left'){
      path.moveTo(shape.startX, shape.startY);
      path.lineTo(shape.endX, shape.endY);
      path.closePath();
    }
    else if(shape.type === 'line' || shape.type === 'arrow' || shape.type === 'line-body'){
      path.moveTo(shape.startX, shape.startY);
      if(shape.cp1X && shape.cp1Y){
        const controlX = 2 * shape.cp1X - 0.5 * shape.startX - 0.5 * shape.endX;
        const controlY = 2 * shape.cp1Y - 0.5 * shape.startY - 0.5 * shape.endY;

        path.quadraticCurveTo(controlX, controlY, shape.endX, shape.endY);
      }
      else{
        path.lineTo(shape.endX, shape.endY);
      }
      path.closePath();
    }
    else if(shape.type === 'pencil'){
      path.moveTo(shape.points[0].x, shape.points[0].y);
      for(let i = 1; i < shape.points.length; i++){
        path.lineTo(shape.points[i].x, shape.points[i].y);
      }
      path.closePath();
    }

    this.ctx.lineWidth = 15;
    const isHit = this.ctx.isPointInStroke(path, pointX, pointY);
    this.ctx.lineWidth = 1;

    return isHit;
  }

  private selectShapesWithinRect(startX: number, startY: number, endX: number, endY: number){
    this.selectedShapes = [];

    const rect = {
      startX: Math.min(startX, endX),
      startY: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    }

    this.existingShapes.map((shape) => {
      let isContained = false;
      if(shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'text'){
        isContained = this.isPointInRectangle(shape.startX, shape.startY, rect) && this.isPointInRectangle(shape.startX + shape.width, shape.startY + shape.height, rect);
      }
      else if(shape.type === 'ellipse'){
        const startX = shape.centerX - shape.radiusX, startY = shape.centerY - shape.radiusY, width = 2 * shape.radiusX, height = 2 * shape.radiusY;

        isContained = this.isPointInRectangle(startX, startY, rect) && this.isPointInRectangle(startX + width, startY + height, rect);
      }
      else if(shape.type === 'line' || shape.type === 'arrow'){
        isContained = this.isPointInRectangle(shape.startX, shape.startY, rect) && this.isPointInRectangle(shape.endX, shape.endY, rect);
        
        if(shape.cp1X && shape.cp1Y){
          isContained = isContained && this.isPointInRectangle(shape.cp1X, shape.cp1Y, rect);
        }
      }
      else if(shape.type === 'pencil'){
        let [ minmX, maxmX, minmY, maxmY ] = [ shape.points[0].x, shape.points[0].x, shape.points[0].y, shape.points[0].y ];

        for(let i = 1; i < shape.points.length; i++){
          minmX = Math.min(minmX, shape.points[i].x);
          maxmX = Math.max(maxmX, shape.points[i].x);
          minmY = Math.min(minmY, shape.points[i].y);
          maxmY = Math.max(maxmY, shape.points[i].y);
        }

        isContained = this.isPointInRectangle(minmX, minmY, rect) && this.isPointInRectangle(maxmX, maxmY, rect);
      }

      if(isContained){
        this.selectedShapes.push(shape.id);
      }
    });
  }

  private getHandles(){
    const handleSize = 8;
    const handles: Handle[] = [];
    const selectedShapes = this.existingShapes.filter(shape => this.selectedShapes.includes(shape.id));

    if(selectedShapes.length === 1){
      if (selectedShapes[0].type === 'rect' || selectedShapes[0].type === 'diamond' || selectedShapes[0].type === 'text') {
        const { startX, startY, width, height } = selectedShapes[0];

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
      else if(selectedShapes[0].type === 'ellipse'){
        const { centerX, centerY, radiusX, radiusY } = selectedShapes[0];
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
      else if(selectedShapes[0].type === 'line' || selectedShapes[0].type === 'arrow'){
        const centerX = (selectedShapes[0].startX + selectedShapes[0].endX) / 2, centerY =  (selectedShapes[0].startY + selectedShapes[0].endY) / 2; 

        handles.push({ x: selectedShapes[0].startX, y: selectedShapes[0].startY, radius: handleSize - 3, type: 'anchor-point-start' });
        handles.push({ x: selectedShapes[0].endX, y: selectedShapes[0].endY, radius: handleSize - 3, type: 'anchor-point-end' });
        
        if(selectedShapes[0].cp1X && selectedShapes[0].cp1Y){
          const startX = Math.min(selectedShapes[0].startX, selectedShapes[0].cp1X, selectedShapes[0].endX), startY = Math.min(selectedShapes[0].startY, selectedShapes[0].cp1Y - 20, selectedShapes[0].endY);
          const endX = Math.max(selectedShapes[0].startX, selectedShapes[0].cp1X, selectedShapes[0].endX), endY = Math.max(selectedShapes[0].startY, selectedShapes[0].cp1Y + 20, selectedShapes[0].endY);

          handles.push({ x: selectedShapes[0].cp1X, y: selectedShapes[0].cp1Y, radius: handleSize - 4, type: 'control-point' });
          
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
          handles.push({ startX: selectedShapes[0].startX, startY: selectedShapes[0].startY, endX: selectedShapes[0].endX, endY: selectedShapes[0].endY, type: 'line-body' });
        }
      }
      else if(selectedShapes[0].type === 'pencil'){
        let [ minX, maxX, minY, maxY ] = [ selectedShapes[0].points[0].x, selectedShapes[0].points[0].x, selectedShapes[0].points[0].y, selectedShapes[0].points[0].y ];

        for(let i = 1; i < selectedShapes[0].points.length; i++){
          minX = Math.min(minX, selectedShapes[0].points[i].x);
          maxX = Math.max(maxX, selectedShapes[0].points[i].x);
          minY = Math.min(minY, selectedShapes[0].points[i].y);
          maxY = Math.max(maxY, selectedShapes[0].points[i].y);
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

      selectedShapes.map((shape) => {
        if (shape.type === 'rect' || shape.type === 'diamond' || shape.type === 'text') {
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

    this.handles = handles;
  }

  public addText(startX: number, startY: number, width: number, height: number, text: string){
    this.existingShapes.push({
      id: this.totalShapes + 1,
      fontSize: 16,
      type: 'text',
      startX,
      startY,
      width,
      minWidth: width,
      height,
      text
    });

    this.selectedTool = 1;
    this.dispatch(changeSelectedTool(1));
    
    this.totalShapes += 1;
    this.selectedShapes = [this.totalShapes];
    this.getHandles();
    this.redraw();
  }

  // public addImage(startX: number, startY: number, image: string){

  // }

  private redraw(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgb(255,255,255)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "rgb(48, 25, 52)";

    this.existingShapes.map((shape) => {
      if(shape.type === "rect"){     
        this.ctx.strokeRect(shape.startX, shape.startY, shape.width, shape.height);
      }
      else if(shape.type === 'diamond'){
        const centerX = shape.startX + shape.width / 2;
        const centerY = shape.startY + shape.height / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, shape.startY);
        this.ctx.lineTo(shape.startX + shape.width, centerY);
        this.ctx.lineTo(centerX, shape.startY + shape.height);
        this.ctx.lineTo(shape.startX, centerY);
        this.ctx.closePath();

        this.ctx.strokeStyle = "rgba(0, 0, 0)";
        this.ctx.stroke();
      }
      else if(shape.type === "ellipse"){
        this.ctx.beginPath();
        this.ctx.ellipse(shape.centerX, shape.centerY, shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);
        this.ctx.stroke();
      }
      else if(shape.type === "arrow"){
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
      }
      else if(shape.type === "line"){
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
      }
      else if(shape.type === 'pencil'){
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        
        this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for(let i = 1; i < shape.points.length; i++){
          this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
      }
      else if(shape.type === 'text'){
        this.ctx.font = `${shape.fontSize}px Arial`;
        this.ctx.fillStyle = 'rgb(0,0,0)';

        const lines = shape.text.split('\n');
        const lineHeight = shape.fontSize * 1.25;

        for(let i = 0; i < lines.length; i++){
          this.ctx.fillText(lines[i], shape.startX, shape.startY + lineHeight * (i + 1));
        }
      }
    });

    const sortedHandles = [...this.handles].sort((a,b) => {
      const getWeight = (type: string) => {
        return (type === 'body' || type ==='selection-body') ? 0 : 1;
      }

      return getWeight(a.type) - getWeight(b.type);
    })

    sortedHandles.map((handle) => {
      this.ctx.strokeStyle = "rgb(96, 80, 220)";
      this.ctx.lineWidth = 1;
      if(handle.type === 'body'){
        this.ctx.strokeRect(handle.startX, handle.startY, handle.width, handle.height);
      }
      else if(handle.type === 'selection-body'){
        this.ctx.setLineDash([2, 2]);
        this.ctx.strokeRect(handle.startX, handle.startY, handle.width, handle.height);
        this.ctx.setLineDash([]);
      }
      else if(handle.type === 'top-left' || handle.type === 'top-right' || handle.type === 'bottom-left' || handle.type === 'bottom-right'){
        this.ctx.fillStyle = "rgb(255, 255, 255)";
        this.ctx.fillRect(handle.startX, handle.startY, handle.width, handle.height);
        this.ctx.strokeRect(handle.startX, handle.startY, handle.width, handle.height);
      }
      else if(handle.type === 'control-point'){
        this.ctx.fillStyle = "rgb(204, 204, 255, 0.60)";
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, handle.radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.fill();
      }
      else if(handle.type === 'rotate' || handle.type === 'anchor-point-start' || handle.type === 'anchor-point-end'){
        this.ctx.fillStyle = "rgb(255, 255, 255)";
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, 4, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.fill();
      }
    });
  }
}