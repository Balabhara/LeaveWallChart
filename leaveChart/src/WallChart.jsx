import React, { useMemo, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setBaseDate,
  setActiveRange,
  setLeaves,
  addLeave,
  setDialogOpen,
  setDialogError,
  setNewLeave,
  leaveColors,
  setEmployeeDialogOpen,
  setNewEmployee,
  addEmployee,
} from "./CreateSlice";
import "./WallChart.css";
import {formatISO,isWeekend,isToday,addMonths,startOfMonth,endOfMonth,startOfWeek,getRangeDays,getLabel,getUserDepartment}
from './Utils'

// ------------------ Component ------------------
export default function WallChart({ initialDate = new Date(), initialLeaves = []}) {
  const dispatch = useDispatch();
  const {
    baseDate,
    activeRange,
    leaves,
    dialogOpen,
    dialogError,
    newLeave,
    employeeDialogOpen,
    newEmployee,
    users: reduxUsers,
  } = useSelector((state) => state.leave);

  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("");


  useEffect(() => {
    if (initialLeaves.length) dispatch(setLeaves(initialLeaves));
    dispatch(setBaseDate(startOfMonth(initialDate)));
  }, [initialLeaves, initialDate, dispatch]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const allowedTypes = Object.keys(leaveColors);

  // --- All users for dropdown (merge initial, redux, and leaves)
  const allUsersForDropdown = useMemo(() => {
    const unique = new Map();
    [ ...(reduxUsers || []), ...leaves.map((lv) => ({
      user: lv.user,
      department: lv.department,
    }))].forEach((u) => {
      if (!unique.has(u.user)) unique.set(u.user, u);
    });
    return Array.from(unique.values());
  }, [reduxUsers, leaves]);

  // Build list of all users having leaves + ensure department
  const allUsersData = useMemo(() => {
    const userMap = {};
    leaves.forEach((lv) => {
      if (!userMap[lv.user])
        userMap[lv.user] = {
          user: lv.user,
          department: lv.department || getUserDepartment(lv.user, allUsersForDropdown),
        };
    });
     // Sort users alphabetically
    return Object.values(userMap).sort((a, b) => a.user.localeCompare(b.user));
  }, [leaves, allUsersForDropdown]);

  // Group users by department (for accordion display)
  const groupedUsers = useMemo(() => {
    return allUsersData.reduce((acc, u) => {
      const dept = u.department || "NO DEPARTMENT";
      (acc[dept] ||= []).push(u.user);
      return acc;
    }, {});
  }, [allUsersData]);
// Department sorting: NO DEPARTMENT always comes first
  const departments = useMemo(() => {
    const depts = Object.keys(groupedUsers);
    return depts.sort((a, b) =>
      a === "NO DEPARTMENT" ? -1 : b === "NO DEPARTMENT" ? 1 : a.localeCompare(b)
    );
  }, [groupedUsers]);

  const days = useMemo(() => getRangeDays(baseDate, activeRange), [baseDate, activeRange]);
  const labelText = useMemo(() => getLabel(baseDate, activeRange), [baseDate, activeRange]);

  // --- Map leaves per user/date ---
  const leaveMap = useMemo(() => {
    const map = {};
    allUsersData.forEach(({ user }) => (map[user] = {}));

  leaves.forEach((lv) => {
  const dept = lv.department || getUserDepartment(lv.user, allUsersForDropdown);
  const from = new Date(lv.from);
  const to = new Date(lv.to);

  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  for (
    let d = new Date(from);
    d <= to;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    map[lv.user][formatISO(d)] = { ...lv, department: dept };
  }
});
    return map;
  }, [leaves, allUsersData, allUsersForDropdown]);

  // Add new leave (validate & update redux)
  const handleAddLeave = () => {
    if (!newLeave.user || !newLeave.type)
      return dispatch(setDialogError("Please fill required fields"));
    if (newLeave.from > newLeave.to)
      return dispatch(setDialogError("'To' date cannot be before 'From' date"));

    const dept =
      allUsersForDropdown.find((u) => u.user === newLeave.user)?.department || "NO DEPARTMENT";

    dispatch(addLeave({ ...newLeave, user: newLeave.user.trim(), department: dept }));
    dispatch(setDialogOpen(false));
    dispatch(setDialogError(""));
    dispatch(setNewLeave({ user: "", type: "", from: new Date(), to: new Date() }));
  };
// basedate update based on Handle navigation
  const handleNav = (direction) => {
    const shift = direction === "prev" ? -1 : 1;
    if (activeRange === "Month") dispatch(setBaseDate(addMonths(baseDate, shift)));
    else {
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + shift * (activeRange === "Week" ? 7 : 1));
      dispatch(setBaseDate(newDate));
    }
  };

  // ------------------ Render ------------------
  return (
    <>
      {/* Top Control Bar */}
      <div className="control-bar">
        <div className="department-filter">
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
            <option value="">-- Department --</option>
            {departments
              .filter((dep) => dep !== "NO DEPARTMENT")
              .map((dep) => (
                <option key={dep}>{dep}</option>
              ))}
          </select>
        </div>

        <div className="date-range-toggle">
          {["Day", "Week", "Month"].map((r) => (
            <button
              key={r}
              className={activeRange === r ? "active" : ""}
              onClick={() => dispatch(setActiveRange(r))}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="month-nav">
          <span className="month-nav-label">{labelText}</span>
          <div className="month-nav-button-group">
            <button onClick={() => handleNav("prev")}>&lt;</button>
            <button onClick={() => handleNav("next")}>&gt;</button>
            <button
              className="nav-apply-button"
              onClick={() => {
                dispatch(setDialogOpen(true));
                dispatch(setDialogError(""));
                dispatch(setNewLeave({ user: "", type: "", from: new Date(), to: new Date() }));
              }}
            >
              Apply Leave
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="leave-wall-container">
        <div className="leave-grid-wrapper">
          {/* Fixed User Column */}
          <div className="user-column-fixed">
            <div className="header-cell">
              <button
                onClick={() => {
                  dispatch(setEmployeeDialogOpen(true));
                  dispatch(setNewEmployee({ user: "", department: "" }));
                }}
              >
                + Add Employee
              </button>
            </div>
            <div className="fixed-column-rows-scroller" id="fixed-column-scroll">
              {departments
                .filter((d) => !selectedDepartment || d === selectedDepartment)
                .map((dept) => (
                  <React.Fragment key={dept}>
                    <div className="department-header" onClick={() =>
                      setExpandedDepartments((prev) => ({
                        ...prev,
                        [dept]: !prev[dept],
                      }))
                    }>
                      <span className="accordion-toggle">
                        {expandedDepartments[dept] ? "▼" : "▶"}
                      </span>
                      {dept}
                    </div>
                    {expandedDepartments[dept] &&
                      groupedUsers[dept]?.map((user) => (
                        <div key={user} className="user-column">
                          <span className="initials">{user[0]}</span>
                          {user}
                        </div>
                      ))}
                  </React.Fragment>
                ))}
            </div>
          </div>

          {/* Scrollable Days Grid */}
          <div className="day-grid-scroll" style={{ "--days-count": days.length }}>
            <div className="leave-header-row">
              {days.map((d) => (
                <div key={formatISO(d)} className={`day-header-cell ${isToday(d) ? "today" : ""}`}>
                  <div className="day-label">{weekdays[d.getDay()]}</div>
                  <div className="day-number">{d.getDate()}</div>
                </div>
              ))}
            </div>

            <div className="main-scrollable-content">
              {departments
                .filter((d) => !selectedDepartment || d === selectedDepartment)
                .map((dept) => (
                  <React.Fragment key={dept + "-grid"}>
                    <div className="department-header-spacer"></div>
                    {expandedDepartments[dept] &&
                      groupedUsers[dept]?.map((user) => (
                        <div key={user} className="leave-row">
                          {days.map((d) => {
                            const leave = leaveMap[user][formatISO(d)];
                            const weekend = isWeekend(d);
                            const bg = leave
                              ? leaveColors[leave.type]
                              : weekend
                              ? "#f3f4f6"
                              : "#fcfcfc";
                            return (
                              <div
                                key={formatISO(d) + user}
                                className={`leave-cell ${weekend ? "weekend" : ""}`}
                                style={{ backgroundColor: bg }}
                                title={
                                  leave
                                    ? `${leave.type} (${formatISO(leave.from)} → ${formatISO(
                                        leave.to
                                      )})`
                                    : weekend
                                    ? "Weekend"
                                    : ""
                                }
                              >
                                {!weekend && leave ? leave.type[0] : ""}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </React.Fragment>
                ))}
            </div>
          </div>
        </div>

        {/* Legend items*/}
        <div className="legend-items">
          {allowedTypes.map((type) => (
            <span key={type} className="legend-item">
              <span
                style={{
                  backgroundColor: leaveColors[type],
                  borderRadius: "0.25rem",
                  padding: "0 0.5rem",
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {type[0]}
              </span>{" "}
              - {type}
            </span>
          ))}
        </div>
      </div>

      {/* Add Leave Dialog */}
      {dialogOpen && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3>Add Employee Leave</h3>
            {dialogError && <div className="dialog-error">{dialogError}</div>}
            <div className="dialog-field">
              <label>User *</label>
              <select
                value={newLeave.user}
                onChange={(e) => dispatch(setNewLeave({ ...newLeave, user: e.target.value }))}
              >
                <option value="">-- Select User --</option>
                {allUsersForDropdown.map((u) => (
                  <option key={u.user}>{u.user}</option>
                ))}
              </select>
            </div>

            <div className="dialog-field">
              <label>Leave Type *</label>
              <select
                value={newLeave.type}
                onChange={(e) => dispatch(setNewLeave({ ...newLeave, type: e.target.value }))}
              >
                <option value="">-- Select Leave Type --</option>
                {allowedTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            {["from", "to"].map((field) => (
              <div key={field} className="dialog-field">
                <label>{field === "from" ? "From:" : "To:"}</label>
                <input
                  type="date"
                  value={formatISO(newLeave[field])}
                  onChange={(e) =>
                    dispatch(
                      setNewLeave({
                        ...newLeave,
                        [field]: new Date(e.target.value + "T00:00:00"),
                      })
                    )
                  }
                />
              </div>
            ))}

            <div className="dialog-buttons">
              <button onClick={() => dispatch(setDialogOpen(false))}>Cancel</button>
              <button onClick={handleAddLeave}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Dialog */}
      {employeeDialogOpen && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3>Add New Employee</h3>
            <div className="dialog-field">
              <label>User *</label>
              <input
                type="text"
                value={newEmployee.user}
                onChange={(e) =>
                  dispatch(setNewEmployee({ ...newEmployee, user: e.target.value }))
                }
              />
            </div>
            <div className="dialog-field">
              <label>Department</label>
              <select
                value={newEmployee.department}
                onChange={(e) =>
                  dispatch(setNewEmployee({ ...newEmployee, department: e.target.value }))
                }
              >
                <option value="">-- Select Department --</option>
                {["Development", "Testing", "HR"].map((dep) => (
                  <option key={dep}>{dep}</option>
                ))}
              </select>
            </div>
            <div className="dialog-buttons">
              <button onClick={() => dispatch(setEmployeeDialogOpen(false))}>Cancel</button>
              <button
                onClick={() => {
                  if (!newEmployee.user.trim()) return alert("Please enter a user name");
                  dispatch(addEmployee(newEmployee));
                  dispatch(setEmployeeDialogOpen(false));
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
