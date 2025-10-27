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
import {
  formatISO,
  isWeekend,
  isToday,
  addMonths,
  startOfMonth,
  getRangeDays,
  getLabel,
  getUserDepartment,
  calculateDates
} from "./Utils";

export default function WallChart({ initialDate = new Date(), initialLeaves = [] }) {
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
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [dragUser, setDragUser] = useState(null);
  const [isUserLocked, setIsUserLocked] = useState(false);

  // Load saved data from localStorage on startup
const initialized = React.useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;

  const savedLeaves = JSON.parse(localStorage.getItem("leavesData") || "[]");

  if (savedLeaves.length > 0) {
    dispatch(setLeaves(savedLeaves));
  } else if (initialLeaves.length > 0) {
    dispatch(setLeaves(initialLeaves));
  }

  dispatch(setBaseDate(startOfMonth(initialDate)));
}, [dispatch, initialDate, initialLeaves]);



  // Persist leaves & users into localStorage when they change
  useEffect(() => {
    localStorage.setItem("leavesData", JSON.stringify(leaves));
  }, [leaves]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const allowedTypes = Object.keys(leaveColors);
  const daysCalc = calculateDates(newLeave.from, newLeave.to);
  const currentUserLeave = leaves.find((lv) => lv.user === newLeave.user);
  const totalLeave = currentUserLeave?.totalLeave ?? 0;

  const allUsersForDropdown = useMemo(() => {
    const unique = new Map();
    [...(reduxUsers || []), ...leaves.map((lv) => ({
      user: lv.user,
      department: lv.department,
    }))].forEach((u) => {
      if (!unique.has(u.user)) unique.set(u.user, u);
    });
    return Array.from(unique.values());
  }, [reduxUsers, leaves]);

  const allUsersData = useMemo(() => {
    const userMap = {};
    leaves.forEach((lv) => {
      if (!userMap[lv.user])
        userMap[lv.user] = {
          user: lv.user,
          department: lv.department || getUserDepartment(lv.user, allUsersForDropdown),
        };
    });
    return Object.values(userMap).sort((a, b) => a.user.localeCompare(b.user));
  }, [leaves, allUsersForDropdown]);

  const groupedUsers = useMemo(() => {
    return allUsersData.reduce((acc, u) => {
      const dept = u.department || "NO DEPARTMENT";
      (acc[dept] ||= []).push(u.user);
      return acc;
    }, {});
  }, [allUsersData]);

  const departments = useMemo(() => {
    const depts = [...new Set(Object.keys(groupedUsers))];
    return depts.sort((a, b) =>
      a === "NO DEPARTMENT" ? -1 : b === "NO DEPARTMENT" ? 1 : a.localeCompare(b)
    );
  }, [groupedUsers]);

  const days = useMemo(() => getRangeDays(baseDate, activeRange), [baseDate, activeRange]);
  const labelText = useMemo(() => getLabel(baseDate, activeRange), [baseDate, activeRange]);

  const leaveMap = useMemo(() => {
    const map = {};
    allUsersData.forEach(({ user }) => (map[user] = {}));

    leaves.forEach((lv) => {
      const dept = lv.department || getUserDepartment(lv.user, allUsersForDropdown);
      const from = new Date(lv.from);
      const to = new Date(lv.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        map[lv.user][formatISO(d)] = { ...lv, department: dept };
      }
    });
    return map;
  }, [leaves, allUsersData, allUsersForDropdown]);

  const handleAddLeave = () => {
    if (!newLeave.user || !newLeave.type || !newLeave.description)
      return dispatch(setDialogError(" * Please fill required fields"));
    if (newLeave.from > newLeave.to)
      return dispatch(setDialogError("'To' date cannot be before 'From' date"));

    const dept =
      allUsersForDropdown.find((u) => u.user === newLeave.user)?.department || "NO DEPARTMENT";

    dispatch(addLeave({ ...newLeave, user: newLeave.user.trim(), department: dept }));
    dispatch(setDialogOpen(false));
    dispatch(setDialogError(""));
    dispatch(setNewLeave({ user: "", type: "", from: new Date(), to: new Date() }));
  };

  const handleNav = (direction) => {
    const shift = direction === "prev" ? -1 : 1;
    if (activeRange === "Month") dispatch(setBaseDate(addMonths(baseDate, shift)));
    else {
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + shift * (activeRange === "Week" ? 7 : 1));
      dispatch(setBaseDate(newDate));
    }
  };

  const toLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const handleMouseDown = (user, date) => {
    setDragStart(date);
    setDragEnd(date);
    setDragUser(user);
  };

  const handleMouseEnter = (user, date) => {
    if (dragStart && dragUser === user) {
      setDragEnd(date);
    }
  };

  const handleMouseUp = () => {
    if (dragStart && dragEnd && dragUser) {
      const from = dragStart < dragEnd ? dragStart : dragEnd;
      const to = dragStart < dragEnd ? dragEnd : dragStart;

      dispatch(setNewLeave({ user: dragUser, type: "", from, to }));
      dispatch(setDialogError(""));
      dispatch(setDialogOpen(true));
      setIsUserLocked(true);
    }
    setDragStart(null);
    setDragEnd(null);
    setDragUser(null);
  };

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
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="leave-wall-container" onMouseUp={handleMouseUp}>
        <div className="leave-grid-wrapper">
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
                    <div
                      className="department-header"
                      onClick={() =>
                        setExpandedDepartments((prev) => ({
                          ...prev,
                          [dept]: !prev[dept],
                        }))
                      }
                    >
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
                              ? leaveColors[leave?.type]
                              : weekend
                              ? "#f3f4f6"
                              : "#fcfcfc";

                            const isSelected =
                              dragUser === user &&
                              dragStart &&
                              dragEnd &&
                              d >= (dragStart < dragEnd ? dragStart : dragEnd) &&
                              d <= (dragStart > dragEnd ? dragStart : dragEnd);

                            return (
                              <div
                                key={formatISO(d) + user}
                                className={`leave-cell ${weekend ? "weekend" : ""} ${
                                  isSelected ? "drag-selected" : ""
                                } ${leave ? "leave-date" : ""}`}
                                style={{
                                  backgroundColor: isSelected ? "#dbeafe" : bg,
                                  cursor: "pointer",
                                }}
                                onMouseDown={() => handleMouseDown(user, d)}
                                onMouseEnter={() => handleMouseEnter(user, d)}
                                title={
                                  leave
                                    ? `${leave?.type} (${formatISO(leave.from)} → ${formatISO(
                                        leave.to
                                      )})`
                                    : weekend
                                    ? "Weekend"
                                    : ""
                                }
                              >
                                {!weekend && leave ? leave?.type?.[0] : ""}
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

        {/* Legend */}
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
      <div className="side-panel">
        <div className="side-panel-content">
          <div className="side-panel-header">
            <h3>Request Leave</h3>
            <button className="close-btn" onClick={() => dispatch(setDialogOpen(false))}>✕</button>
          </div>

          <div className="side-panel-body">

            {/* Left Section */}
            <div className="dialog-section">
            {dialogError && <div className="dialog-error">{dialogError}</div>}
              <div className="dialog-field">
                <label>Team Member *</label>
                <select
                  disabled={isUserLocked}
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

              <div className="dialog-field">
                <label>From:</label>
                <input
                  type="date"
                  value={formatISO(newLeave.from)}
                  onChange={(e) =>
                    dispatch(setNewLeave({ ...newLeave, from: toLocalDate(e.target.value) }))
                  }
                />
              </div>

              <div className="dialog-field">
                <label>To:</label>
                <input
                  type="date"
                  value={formatISO(newLeave.to)}
                  onChange={(e) =>
                    dispatch(setNewLeave({ ...newLeave, to: toLocalDate(e.target.value) }))
                  }
                />
              </div>
                  <div className="dialog-field">
                <label>Description *</label>
                <textarea
                  placeholder="Enter a short description..."
                  value={newLeave.description || ""}
                  onChange={(e) => dispatch(setNewLeave({ ...newLeave, description: e.target.value }))}
                />
              </div>

              <div className="request-dialog dialog-buttons">
                <button onClick={handleAddLeave}>Apply</button>
                <button className="cancel" onClick={() => dispatch(setDialogOpen(false))}>
                  Cancel
                </button>
              </div>
            </div>

            {/* Right Section */}
            <div className="dialog-summary">
              <h4>Leave Details</h4>
              <div className="details-box">
                <p>{formatISO(newLeave.from)} → {formatISO(newLeave.to)}</p>
                <input type="text"
                value="Full Days"
                disabled='true'
                />
                <p style={{ marginTop: "0.5rem" }}>
                  Total: <strong>{daysCalc}{daysCalc>1?'days':'day'}</strong> {newLeave.type && `(${newLeave.type})`}
                </p>
              </div>
              <h4>Allowance Summary</h4> 
              <div className="allowance-box"> 
                <div><strong>Current:</strong>{totalLeave} days</div> 
              <div><strong>New:</strong> {totalLeave - daysCalc} days</div> 
              <div style={{ color: "red" }}><strong>Change:</strong> ↓ {daysCalc}{daysCalc>1?'days':'day'}</div> </div>
            </div>
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
