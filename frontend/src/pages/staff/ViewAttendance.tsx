import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { usePermissions } from "@/hooks/usePermissions";

interface AttendanceRecord {
  uuid: string;
  user_uuid: string;
  date: string;
  status: string;
  working_day: number;
  note: string | null;
}

interface StaffInfo {
  username: string;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  clocked_in:  { label: "Clocked In",   color: "bg-blue-100 text-blue-700" },
  excused:     { label: "Excused",       color: "bg-emerald-100 text-emerald-700" },
  not_excused: { label: "Not Excused",   color: "bg-red-100 text-red-700" },
  half_day:    { label: "Half Day",      color: "bg-amber-100 text-amber-700" },
  clocked_out: { label: "Clocked Out",   color: "bg-zinc-100 text-zinc-700" },
};

export default function ViewAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canManageStaff = hasPermission("staff:management");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date range state
  // Default to 7 days ago until today
  const defaultEnd = new Date().toISOString().split("T")[0];
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const token = localStorage.getItem("token");

  const fetchStaffDetails = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (error) {
      console.error("Failed to fetch staff details", error);
    }
  }, [id, token]);

  const fetchAttendance = useCallback(async () => {
    if (!id || !token) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(`${API_BASE_URL}/attendance/${id}/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to load attendance history");
      
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id, token, startDate, endDate]);

  useEffect(() => {
    if (canManageStaff) {
      fetchStaffDetails();
      fetchAttendance();
    }
  }, [canManageStaff, fetchStaffDetails, fetchAttendance]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendance();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (!isLoadingPermissions && !canManageStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view staff attendance.</p>
      </div>
    );
  }

  const totalWorkingDays = records.reduce((sum, record) => sum + (record.working_day || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/staff")}
          className="text-zinc-400 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-zinc-400" />
            Attendance History
          </h1>
          {staff && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {staff.name || staff.username} <span className="text-zinc-400">@{staff.username}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <form onSubmit={handleFilter} className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-1.5 flex-1 max-w-[200px]">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 flex-1 max-w-[200px]">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button type="submit" className="gap-2 bg-black text-white hover:bg-zinc-800" disabled={isLoading}>
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </form>
      </div>

      {/* ── Attendance Table ──────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Date</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Working Day</TableHead>
              <TableHead className="font-medium">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  Loading attendance history...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  No attendance records found for this period.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {records.map((record) => {
                  const cfg = statusConfig[record.status] || { label: record.status, color: "bg-zinc-100 text-zinc-700" };
                  return (
                    <TableRow key={record.uuid} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-medium text-zinc-900">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-zinc-700 font-medium">{record.working_day}</span>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm text-zinc-600 truncate" title={record.note || ""}>
                          {record.note || <span className="text-zinc-300 italic">—</span>}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Summary Row */}
                <TableRow className="bg-zinc-50/80 font-medium">
                  <TableCell colSpan={2} className="text-right text-zinc-700">
                    Total Days Worked:
                  </TableCell>
                  <TableCell colSpan={2} className="text-emerald-700 text-lg font-semibold">
                    {totalWorkingDays}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
