import React from "react";
import { Provider } from "react-redux";
import { store } from "./Store";
import Parent from "./Parent";

const leavesData= [
  { id: 1, user: "Bala bharathi", from: "2025-10-03", to: "2025-10-06", type: "Sick Leave",department:"Testing" },
  { id: 2, user: "Vasanth", from: "2025-10-05", to: "2025-10-08", type: "Sick Leave",department:"Testing" },
  { id: 3, user: "Meiyarasan", from: "2025-10-10", to: "2025-10-13", type: "Casual Leave",department:"Developement" },
  { id: 4, user: "SasiKumar", from: "2025-10-01", to: "2025-10-02", type: "Annual Leave",department:"HR" },
  { id: 5, user: "Nagaraj", from: "2025-10-20", to: "2025-10-23", type: "Casual Leave",department:"Testing" }
];

export default function App() {
  return (
    <Provider store={store}>
      <Parent initialLeaves={leavesData} initialDate={new Date(2025, 9, 1)} />
    </Provider>
  );
}
