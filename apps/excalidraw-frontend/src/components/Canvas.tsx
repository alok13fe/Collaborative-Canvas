"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Board } from '@/utils/Board';

export default function Canvas() {

  const dispatch = useAppDispatch();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardInstanceRef = useRef<Board | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingText, setIsEditingText] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  const { selectedTool, lockTool } = useAppSelector(state => state.board);

  function handleMouseDown(e: MouseEvent){
    if(!isEditingText && selectedTool === 8){
      setIsEditingText(true);
      setTextPosition({ x: e.clientX, y: e.clientY });
    }
  }

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
      boardInstanceRef.current?.addText(textPosition.x, textPosition.y, textInputRef.current?.scrollWidth, textInputRef.current?.scrollHeight, textInputRef.current?.value);
    }
    setIsEditingText(false);
  }

  useEffect(() => {
    if(canvasRef.current){
      boardInstanceRef.current = new Board(canvasRef.current, dispatch);      
    }
  },[]);

  useEffect(() => {
    if(boardInstanceRef.current){
      boardInstanceRef.current.changeSelectedTool(selectedTool);
    }
  },[selectedTool]);

  useEffect(() => {
    if(boardInstanceRef.current){
      boardInstanceRef.current.setLockTool(lockTool);
    }
  },[lockTool]);

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    }
  }, [isEditingText, selectedTool]);

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
