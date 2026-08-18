import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Banknote, CheckCircle2, Loader2 } from "lucide-react";
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

interface SalaryRecord {
  uuid: string;
  transaction_type: string;
  transaction_on: string;
  amount: number;
  transaction_date: string;
  created_at: string;
}

interface StaffInfo {
  username: string;
  name: string;
}

export default function StaffSalaryManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canManageStaff = hasPermission("staff:management");

  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date range state
  // Default to current month YYYY-MM
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // New salary form state
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fetchSalaries = useCallback(async () => {
    if (!id || !token) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/users/${id}/salary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load salary history");
      
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (canManageStaff) {
      fetchStaffDetails();
      fetchSalaries();
    }
  }, [canManageStaff, fetchStaffDetails, fetchSalaries]);

  const handleSettleSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/users/${id}/salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          month: selectedMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle salary");

      toast.success("Salary settled successfully!");
      setAmount("");
      fetchSalaries();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatMonth = (transactionOn: string) => {
    // transaction_on is in format "uuid:salary:YYYY-MM"
    const parts = transactionOn.split(":");
    if (parts.length >= 3) {
      const ym = parts[2]; // YYYY-MM
      try {
        const [year, month] = ym.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } catch {
        return ym;
      }
    }
    return transactionOn;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  if (!isLoadingPermissions && !canManageStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to manage staff salaries.</p>
      </div>
    );
  }

  const selectedMonthRecord = records.find((r) => r.transaction_on.endsWith(`salary:${selectedMonth}`));

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
            <Banknote className="w-7 h-7 text-zinc-400" />
            Salary Management
          </h1>
          {staff && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {staff.name || staff.username} <span className="text-zinc-400">@{staff.username}</span>
            </p>
          )}
        </div>
      </div>

      <div className="w-full">
        {/* ── Filter / Setup Box ──────────────────────────── */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-4">Check Salary Status</h2>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="month">Select Month & Year</Label>
                <Input
                  id="month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            {isLoading ? (
              <div className="flex items-center gap-2 text-zinc-500 justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                Checking status...
              </div>
            ) : selectedMonthRecord ? (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500" />
                <p className="font-medium text-lg">Salary Settled</p>
                <p className="text-sm opacity-80 mt-1">
                  {formatCurrency(selectedMonthRecord.amount)} paid on {formatDate(selectedMonthRecord.transaction_date)}
                </p>
              </div>
            ) : (
              <div className="bg-zinc-50 p-5 rounded-lg border">
                <h3 className="font-medium mb-1">Salary not settled for this month</h3>
                <p className="text-sm text-zinc-500 mb-4">Enter the amount to settle the salary.</p>
                <form onSubmit={handleSettleSalary} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₦</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-8"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="bg-black text-white hover:bg-zinc-800 shrink-0" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Settle Salary"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Salary History Table ──────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-zinc-50/50">
          <h2 className="font-medium text-zinc-900">Salary History</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium">Salary Month</TableHead>
              <TableHead className="font-medium">Amount Settled</TableHead>
              <TableHead className="font-medium">Transaction Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                  Loading salary history...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                  No salary records found for this staff member.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium text-zinc-900 capitalize">
                    {formatMonth(record.transaction_on)}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-700">
                    {formatCurrency(record.amount)}
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {formatDate(record.transaction_date)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
