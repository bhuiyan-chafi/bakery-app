import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Settings2, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";

interface MiscellaneousTransaction {
  uuid: string;
  transaction_type: string;
  transaction_on: string;
  amount: number;
  transaction_date: string;
}

export default function MiscellaneousPage() {
  const [transactions, setTransactions] = useState<MiscellaneousTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState("income");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/miscellaneous`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching miscellaneous transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !note || !amount || !date) {
      toast.error("Please fill all fields");
      return;
    }
    if (note.length > 15) {
      toast.error("Note must not exceed 15 characters");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/miscellaneous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_type: type,
          transaction_on: note,
          amount: parseFloat(amount),
          transaction_date: date,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add transaction");
      }

      toast.success("Transaction added successfully");
      setNote("");
      setAmount("");
      setDate("");
      fetchTransactions();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-zinc-900">
          <Link to="/accounts">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
            <Settings2 className="w-7 h-7 text-zinc-400" />
            Miscellaneous Transactions
          </h1>
          <p className="text-muted-foreground mt-1">Manage ad-hoc income and expenses.</p>
        </div>
      </div>

      {/* ── Add Transaction Form ──────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Add New Transaction</h3>
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:items-end gap-4 w-full pb-2">
          <div className="flex-1 space-y-1">
            <span className="text-sm font-medium text-zinc-600">Type:</span>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-[2] space-y-1">
            <span className="text-sm font-medium text-zinc-600">Note:</span>
            <Input 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Tips (max 15 chars)" 
              maxLength={15}
              className="h-9 w-full text-sm" 
            />
          </div>

          <div className="flex-1 space-y-1">
            <span className="text-sm font-medium text-zinc-600">Amount:</span>
            <Input 
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" 
              className="h-9 w-full text-sm" 
            />
          </div>

          <div className="flex-1 space-y-1">
            <span className="text-sm font-medium text-zinc-600">Date:</span>
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full text-sm" 
            />
          </div>

          <Button type="submit" className="h-9 px-6 w-full lg:w-auto flex items-center justify-center gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </form>
      </div>

      {/* ── Transactions List ───────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-zinc-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">Recent Transactions</h3>
          <Button variant="ghost" size="sm" onClick={fetchTransactions} disabled={loading} className="h-8">
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.uuid}>
                  <TableCell>{t.transaction_date}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      t.transaction_type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {t.transaction_type.charAt(0).toUpperCase() + t.transaction_type.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{t.transaction_on}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(t.amount).toFixed(2)}
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
