import { configureStore } from "@reduxjs/toolkit";
import leaveReducer from "./CreateSlice";

export const store = configureStore({
  reducer: {
    leave: leaveReducer,
  },
});
