"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Board } from '@/draw/Board';
import { addShape, deleteShapes, clearSelection, changeSelectedTool } from '@/lib/features/board/boardSlice';
import { Shape } from '@repo/common/shapes';

export default function Canvas() {

  const dispatch = useAppDispatch();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardInstanceRef = useRef<Board | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingText, setIsEditingText] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  const { selectedTool, existingShapes, selectedShapes } = useAppSelector(state => state.board);

  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if(!boardInstanceRef.current) return;

    if(e.key === 'Shift'){
      boardInstanceRef.current.shiftKeyDown = true;
    }
    else if(e.key === 'Control'){
      boardInstanceRef.current.controlKeyDown = true;
    }
    else if(e.key === 'Delete'){
      if(selectedShapes.length !== 0){
        dispatch(deleteShapes(selectedShapes));
      }
    }
    else if(boardInstanceRef.current.controlKeyDown){
      if(e.key === 'c'){
        const shapes = existingShapes.filter((shape) => {
          return selectedShapes.includes(shape.id);
        });

        navigator.clipboard.writeText(JSON.stringify(shapes));
      }
      else if(e.key === 'x'){
        const shapes = existingShapes.filter((shape) => {
          return selectedShapes.includes(shape.id);
        });

        navigator.clipboard.writeText(JSON.stringify(shapes));

        dispatch(deleteShapes(selectedShapes));
      }
      else if(e.key === 'v'){
        const shapes = await navigator.clipboard.readText();
        try{
          const selectedShapes = JSON.parse(shapes);
          dispatch(clearSelection());

          selectedShapes.map((shape: Shape) => {
            dispatch(
              addShape({
                ...shape
              })
            )
          });
        } catch(err) {
          console.log(err);
        }
      }
    }
  },[dispatch, existingShapes, selectedShapes]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if(!boardInstanceRef.current)  return;

    if(e.key === 'Shift'){
      boardInstanceRef.current.shiftKeyDown = false;
    }
    else if(e.key === 'Control'){
      boardInstanceRef.current.controlKeyDown = false;
    }
  },[boardInstanceRef]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if(!isEditingText && selectedTool === 8){
      setIsEditingText(true);
      setTextPosition({ x: e.clientX, y: e.clientY });
    }
    else{
      boardInstanceRef.current?.handleMouseDown(e, existingShapes, selectedShapes);
    }
  },[isEditingText, selectedTool, existingShapes, selectedShapes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    boardInstanceRef.current?.handleMouseMove(e, existingShapes, selectedShapes);
  },[existingShapes, selectedShapes]);
  
  const handleMouseUp = useCallback((e: MouseEvent) => {
    boardInstanceRef.current?.handleMouseUp(e, existingShapes, selectedShapes);
  },[existingShapes, selectedShapes]);

  function handleTextareaInput(){
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';

      textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
      textInputRef.current.style.width = textInputRef.current.scrollWidth + 'px';
    }
  };

  function handleTextSubmit(e: React.KeyboardEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>){
    if (e.type === 'keyup') {
      return;
    }

    if(textInputRef.current?.value){
      dispatch(changeSelectedTool(1));

      boardInstanceRef.current?.addText(textPosition.x, textPosition.y, textInputRef.current?.scrollWidth, textInputRef.current?.value);
    }

    setIsEditingText(false);
  }

  /* Initialize Board */
  useEffect(() => {
    if(canvasRef.current){
      boardInstanceRef.current = new Board(canvasRef.current, dispatch);      
    }
  },[dispatch]);

  /* Change Selected Tool */
  useEffect(() => {
    if(boardInstanceRef.current){
      boardInstanceRef.current.changeSelectedTool(selectedTool);
    }
  },[selectedTool]);

  /* Redraw Shapes */
  useEffect(() => {
    if(boardInstanceRef.current){
      boardInstanceRef.current.redraw(existingShapes, selectedShapes);
    }
  },[existingShapes, selectedShapes]);

  /* Mouse Handlers */
  useEffect(() => {
    if(!canvasRef.current) return;

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  },[handleMouseDown, handleMouseMove, handleMouseUp]);

  /* Keyboard Handlers */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleKeyUp);
    }
  },[handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (isEditingText && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 0);
    }
  }, [isEditingText]);

  return (
    <>
      <canvas ref={canvasRef} data-tool={selectedTool} ></canvas>
      {
        isEditingText && 
        <textarea
          ref={textInputRef}
          style={{
            left: `${textPosition.x}px`,
            top: `${textPosition.y}px`
          }}
          className={`w-4 h-16 absolute border-0 outline-0 resize-none overflow-hidden`}
          onBlur={handleTextSubmit} 
          onKeyUp={handleTextSubmit} 
          onInput={handleTextareaInput}
          wrap='off'
        />
      }
    </>
  )
}