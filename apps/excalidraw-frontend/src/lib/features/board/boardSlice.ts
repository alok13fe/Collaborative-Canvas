import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// Define a type for the slice state
interface BoardState {
  selectedTool: number;
  lockTool: boolean;
}

// Define the initial state using that type
const initialState: BoardState = {
  selectedTool: 1,
  lockTool: false
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
    }
  },
})

export const { changeSelectedTool, toggleLockTool } = boardSlice.actions
export default boardSlice.reducer