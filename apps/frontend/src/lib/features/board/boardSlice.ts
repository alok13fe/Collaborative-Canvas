import { Shape, ShapeProperties } from '@repo/common/shapes';
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// Define a type for the slice state
interface BoardState {
  selectedTool: number;
  lockTool: boolean;
  existingShapes: Shape[],
  selectedShapes: string[],
  isCollaborating: boolean,
  shapeProperties: ShapeProperties;
}

// Define the initial state using that type
const initialState: BoardState = {
  selectedTool: 1,
  lockTool: false,
  existingShapes: [],
  selectedShapes: [],
  isCollaborating: false,
  shapeProperties: {
    stroke: '#000000',
    fillStyle: 'transparent',
    strokeWidth: 1,
    strokeStyle: 1,
    edges: 'corner',
    fontFamily: "'Shadows Into Light Two', 'Shadows Into Light Two Fallback'",
    fontSize: 20,
    textAlign: 'left',
    opacity: 100
  }
}

export const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    changeSelectedTool: (state, action) => {
      state.selectedTool = action.payload;
      if(state.selectedShapes.length > 0){
        state.selectedShapes = [];
      }
    },
    toggleLockTool: (state) => {
      state.lockTool = !state.lockTool;
    },
    addShape: (state, action) => {
      state.existingShapes.push(action.payload);
      
      if(!state.lockTool && state.selectedTool !== 7){
        state.selectedTool = 1;
          state.selectedShapes = [action.payload.id];
      }
    },
    addRemoteShape: (state, action) => {
      state.existingShapes.push(action.payload);
    },
    modifyShape: (state, action) => {
      const updatedShape = action.payload;
      state.existingShapes = state.existingShapes.map((shape) => {
        if(shape.id === updatedShape.id){
          return updatedShape;
        }
        return shape;
      });
    },
    modifyShapes: (state, action) => {
      const updatedShapes: Shape[] = action.payload;
      updatedShapes.forEach(updatedShape => {
        const index = state.existingShapes.findIndex(shape => shape.id === updatedShape.id);
        if(index !== -1){
          state.existingShapes[index] = updatedShape;
        }
      });
    },
    deleteShapes: (state, action) => {
      state.existingShapes = state.existingShapes.filter((shape) => !action.payload.includes(shape.id));
      
      state.selectedShapes = [];
    },
    selectShape: (state, action) => {
      state.selectedShapes = [...state.selectedShapes, action.payload];
    },
    clearSelection: (state) => {
      state.selectedShapes = [];
    },
    resetBoard: (state) => {
      state.selectedShapes = [];
      state.existingShapes = [];
    },
    startCollaborating: (state) => {
      state.isCollaborating = true;
      state.selectedShapes = [];
      state.existingShapes = [];
    },
    stopCollaborating: (state) => {
      state.isCollaborating = false;
      state.selectedShapes = [];
      state.existingShapes = [];
    },
    setShapeProperties: (state, action) => {
      state.shapeProperties = { ...state.shapeProperties, ...action.payload};
    }
  },
})

export const { changeSelectedTool, toggleLockTool, addShape, addRemoteShape, modifyShape, modifyShapes, deleteShapes, selectShape, clearSelection, resetBoard, startCollaborating, stopCollaborating, setShapeProperties } = boardSlice.actions
export default boardSlice.reducer