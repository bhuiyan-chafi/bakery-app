import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Pencil, RefreshCw, Phone, LogIn, LogOut, Clock, AlertTriangle, CheckCheck, CalendarDays, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { usePermissions } from "@/hooks/usePermissions";

interface StaffUser {
  uuid: string;
  username: string;
  name: string;
  phone: string;
  status: string;
  last_login?: string | null;
  created_at?: string | null;
}

interface AttendanceRecord {
  uuid: string;
  user_uuid: string;
  date: string;
  status: string;
  working_day: number;
  note: string | null;
  clocked_in_at: string | null;
  resolved_at: string | null;
}

type AttendanceMap = Record<string, AttendanceRecord | null>;
type LastAttendedMap = Record<string, string | null>;

const FINALIZED = ["excused", "not_excused", "half_day", "clocked_out"];
const ACTIONS_NEEDING_NOTE = ["excused", "not_excused", "half_day"];

const statusConfig: Record<string, { label: string; color: string }> = {
  clocked_in:  { label: "Clocked In",   color: "bg-blue-100 text-blue-700" },
  excused:     { label: "Excused",       color: "bg-emerald-100 text-emerald-700" },
  not_excused: { label: "Not Excused",   color: "bg-red-100 text-red-700" },
  half_day:    { label: "Half Day",      color: "bg-amber-100 text-amber-700" },
  clocked_out: { label: "Clocked Out",   color: "bg-zinc-100 text-zinc-700" },
};

export default function StaffManagement() {
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canViewStaff = hasPermission("staff:view");
  const canEditStaff = hasPermission("staff:edit");
  const canManageStaff = hasPermission("staff:management");
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [lastAttendedMap, setLastAttendedMap] = useState<LastAttendedMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ userUuid: string; action: string } | null>(null);
  const [note, setNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);

      // Fetch staff list first
      const usersRes = await fetch(`${API_BASE_URL}/users/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!usersRes.ok) throw new Error("Failed to load staff list");
      
      const usersData: StaffUser[] = await usersRes.json();
      const nonAdmin = Array.isArray(usersData)
        ? usersData.filter((u) => u.username.toLowerCase() !== "admin")
        : [];
      
      setStaffList(nonAdmin);

      // Only fetch attendance data if the user has permission to manage staff
      if (canManageStaff) {
        try {
          const attendanceRes = await fetch(`${API_BASE_URL}/attendance/today`, { headers: { Authorization: `Bearer ${token}` } });
          if (attendanceRes.ok) {
            const attendanceData: AttendanceMap = await attendanceRes.json();
            setAttendanceMap(attendanceData);
          }

          // Fetch last-attended dates for each user
          const lastAttended: LastAttendedMap = {};
          await Promise.all(
            nonAdmin.map(async (u) => {
              try {
                const r = await fetch(`${API_BASE_URL}/attendance/${u.uuid}/last-attended`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (r.ok) {
                  const d = await r.json();
                  lastAttended[u.uuid] = d.last_attended ?? null;
                } else {
                  lastAttended[u.uuid] = null;
                }
              } catch {
                lastAttended[u.uuid] = null;
              }
            })
          );
          setLastAttendedMap(lastAttended);
        } catch (e) {
          console.error("Failed to load attendance data", e);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [token, canManageStaff]);

  useEffect(() => {
    if (canViewStaff) {
      fetchData();
    } else if (!isLoadingPermissions) {
      setIsLoading(false);
    }
  }, [canViewStaff, isLoadingPermissions, fetchData]);

  // ── Clock In ────────────────────────────────────────────────────────────────
  const handleClockIn = async (userUuid: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${userUuid}/clock-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clock-in failed");
      setAttendanceMap((prev) => ({ ...prev, [userUuid]: data.record }));
      toast.success("Clocked in successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Resolve (with or without note) ─────────────────────────────────────────
  const handleResolveAction = (userUuid: string, action: string) => {
    if (ACTIONS_NEEDING_NOTE.includes(action)) {
      setPendingAction({ userUuid, action });
      setNote("");
      setNoteModalOpen(true);
    } else {
      submitResolve(userUuid, action, null);
    }
  };

  const submitResolve = async (userUuid: string, action: string, noteText: string | null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${userUuid}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note: noteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update attendance");
      setAttendanceMap((prev) => ({ ...prev, [userUuid]: data.record }));
      // Update last-attended if now finalized
      if (FINALIZED.includes(data.record?.status)) {
        setLastAttendedMap((prev) => ({ ...prev, [userUuid]: data.record.date }));
      }
      toast.success("Attendance updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleNoteSubmit = async () => {
    if (!pendingAction) return;
    if (!note.trim()) {
      toast.error("Please enter a note before submitting");
      return;
    }
    setIsSubmittingNote(true);
    await submitResolve(pendingAction.userUuid, pendingAction.action, note.trim());
    setIsSubmittingNote(false);
    setNoteModalOpen(false);
    setPendingAction(null);
    setNote("");
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const renderAttendanceCell = (user: StaffUser) => {
    const record = attendanceMap[user.uuid];

    if (!record) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => handleClockIn(user.uuid)}
        >
          <LogIn className="w-3.5 h-3.5" />
          Clock In
        </Button>
      );
    }

    const cfg = statusConfig[record.status] || { label: record.status, color: "bg-zinc-100 text-zinc-700" };

    if (FINALIZED.includes(record.status)) {
      return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
          <CheckCheck className="w-3 h-3" />
          {cfg.label}
        </span>
      );
    }

    // Status is clocked_in → show resolve buttons
    return (
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          onClick={() => handleResolveAction(user.uuid, "excused")}
          title="Excused (counted as full day)"
        >
          <CheckCheck className="w-3 h-3" /> Excused
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={() => handleResolveAction(user.uuid, "half_day")}
          title="Half Day (0.5)"
        >
          <Clock className="w-3 h-3" /> Half Day
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => handleResolveAction(user.uuid, "not_excused")}
          title="Not Excused (0 days)"
        >
          <AlertTriangle className="w-3 h-3" /> Not Excused
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          onClick={() => handleResolveAction(user.uuid, "clock_out")}
          title="Clock Out (full day)"
        >
          <LogOut className="w-3 h-3" /> Clock Out
        </Button>
      </div>
    );
  };

  if (!isLoadingPermissions && !canViewStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-zinc-400" />
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">View and manage bakery staff members and attendance.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="h-9 gap-2 w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Staff Table ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">Phone</TableHead>
              <TableHead className="font-medium">Last Attended</TableHead>
              {canManageStaff && <TableHead className="font-medium">Attendance</TableHead>}
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                  Loading staff members...
                </TableCell>
              </TableRow>
            ) : staffList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                  No staff members found.
                </TableCell>
              </TableRow>
            ) : (
              staffList.map((user) => (
                <TableRow key={user.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  {/* Name */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-900">{user.name || user.username}</span>
                      {user.name && user.name !== user.username && (
                        <span className="text-xs text-zinc-400">@{user.username}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Phone */}
                  <TableCell>
                    {user.phone ? (
                      <span className="text-zinc-700 flex items-center gap-1.5 text-sm">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        {user.phone}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Last Attended */}
                  <TableCell>
                    <span className="text-zinc-500 text-sm">
                      {formatDate(lastAttendedMap[user.uuid])}
                    </span>
                  </TableCell>

                  {/* Attendance */}
                  {canManageStaff && (
                    <TableCell>
                      {renderAttendanceCell(user)}
                    </TableCell>
                  )}

                  {/* Action */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canManageStaff && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-black"
                          onClick={() => navigate(`/staff/${user.uuid}/attendance`)}
                          title="View Attendance History"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                      )}
                      {canEditStaff && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-black"
                          onClick={() => navigate(`/staff/${user.uuid}/edit`)}
                          title="Edit Staff"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canManageStaff && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-black"
                          onClick={() => navigate(`/staff/${user.uuid}/salary`)}
                          title="Manage Salary"
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Note Modal ─────────────────────────────────── */}
      <Dialog open={noteModalOpen} onOpenChange={(open) => { if (!open) { setNoteModalOpen(false); setPendingAction(null); setNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === "excused" && "Excused — Add Note"}
              {pendingAction?.action === "half_day" && "Half Day — Add Note"}
              {pendingAction?.action === "not_excused" && "Not Excused — Add Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="attendance-note">Reason / Note</Label>
            <Textarea
              id="attendance-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter the reason or any relevant notes..."
              rows={4}
              disabled={isSubmittingNote}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setNoteModalOpen(false); setPendingAction(null); setNote(""); }} disabled={isSubmittingNote}>
              Cancel
            </Button>
            <Button onClick={handleNoteSubmit} disabled={isSubmittingNote || !note.trim()} className="bg-black text-white hover:bg-zinc-800">
              {isSubmittingNote ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
