import { createSlice } from "@reduxjs/toolkit";

export const leaveColors = {
  "Sick Leave": "#f87171",
  "Casual Leave": "#fbbf24",
  "Annual Leave": "#34d399",
};

const initialState = {
  baseDate: new Date(),
  activeRange: "Month",
  leaves: [],
  dialogOpen: false,
  dialogError: "",
  newLeave: { user: "", type: "", from: new Date(), to: new Date(), description: "" },
  employeeDialogOpen: false,
  newEmployee: { user: "", department: "" },
  users: [],
};

const leaveSlice = createSlice({
  name: "leave",
  initialState,
  reducers: {
    setBaseDate: (state, action) => {
      state.baseDate = action.payload;
    },
    setActiveRange: (state, action) => {
      state.activeRange = action.payload;
    },
    setLeaves: (state, action) => {
      state.leaves = action.payload.map((lv) => ({
        ...lv,
        color: leaveColors[lv.type] || "",
        from: new Date(lv.from),
        to: new Date(lv.to),
        
        totalLeave:lv.totalLeave - ((new Date(lv.to) - new Date(lv.from)) / (1000 * 60 * 60 * 24) + 1)
      }));
    },
    addLeave: (state, action) => {
      const lv = action.payload;

      // Add leave entry
      state.leaves.push({
        ...lv,
        id: Date.now() + state.leaves.length,
        color: leaveColors[lv.type] || "",
        from: new Date(lv.from),
        to: new Date(lv.to),
      });
    },
    setDialogOpen: (state, action) => {
      state.dialogOpen = action.payload;
    },
    setDialogError: (state, action) => {
      state.dialogError = action.payload;
    },
    setNewLeave: (state, action) => {
      state.newLeave = action.payload;
    },
    setEmployeeDialogOpen: (state, action) => {
      state.employeeDialogOpen = action.payload;
    },
    setNewEmployee: (state, action) => {
      state.newEmployee = action.payload;
    },
    addEmployee: (state, action) => {
      const { user, department } = action.payload;
      if (!user) return;

      const exists = state.users.find((u) => u.user === user);
      if (!exists) {
       state.leaves.push({ 
        id: state.leaves.length+1, 
        color: "", from: new Date(),
         to: new Date(), 
         user:user, 
         department:department, 
         description:"",
         totalLeave:24,
         type:""
        });
      }
    },
  },
});

export const {
  setBaseDate,
  setActiveRange,
  setLeaves,
  addLeave,
  setDialogOpen,
  setDialogError,
  setNewLeave,
  setEmployeeDialogOpen,
  setNewEmployee,
  addEmployee,
} = leaveSlice.actions;

export default leaveSlice.reducer;
