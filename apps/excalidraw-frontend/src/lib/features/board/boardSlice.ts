import { Shape } from '@/types';
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// Define a type for the slice state
interface BoardState {
  selectedTool: number;
  lockTool: boolean;
  existingShapes: Shape[],
  totalShapes: number,
  isCollaborating: boolean
}

// Define the initial state using that type
const initialState: BoardState = {
  selectedTool: 1,
  lockTool: false,
  existingShapes: [],
  totalShapes: 0,
  isCollaborating: false
}

export const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    changeSelectedTool: (state, action) => {
      state.selectedTool = action.payload;
    },
    toggleLockTool: (state) => {
      state.lockTool = !state.lockTool;
    },
    addShape: (state, action) => {
      state.existingShapes.push({...action.payload, id: state.totalShapes});
      state.totalShapes += 1;
    },
    modifyShape: (state, action) => {
      const shapeId = action.payload.id;
      const newShape = '';
      
    },
    deleteShape: (state, action) => {
      state.existingShapes = state.existingShapes.filter((shape) => !action.payload.includes(shape.id));
    }
  },
})

export const { changeSelectedTool, toggleLockTool } = boardSlice.actions
export default boardSlice.reducer