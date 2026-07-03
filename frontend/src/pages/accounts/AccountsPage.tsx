import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Settings2, FileText, ArrowRight, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";

interface AccountTransaction {
  uuid: string;
  date: string;
  source: string;
  note: string;
  amount: number;
  type: string;
}

export default function AccountsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("expense");
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select a date range");
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await fetch(
        `${API_BASE_URL}/accounts/transactions?start_date=${startDate}&end_date=${endDate}&type=${type}`
      );
      if (!res.ok) throw new Error("Failed to fetch account transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching transactions");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = transactions.reduce((acc, t) => {
    if (type === 'profit') {
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }
    return acc + t.amount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-zinc-400" />
            Accounts
          </h1>
          <p className="text-muted-foreground mt-1">Account Reports</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link to="/accounts/miscellaneous" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Miscellaneous
          </Link>
        </Button>
      </div>

      {/* ── Search Panel ──────────────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-3 shadow-sm flex items-center gap-6 w-full overflow-x-auto">
        {/* Item 1: Date Range */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-600 whitespace-nowrap">Date:</span>
          <Input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full text-sm" 
          />
          <span className="text-zinc-400">-</span>
          <Input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-full text-sm" 
          />
        </div>
        
        {/* Item 2: Type Selection */}
        <div className="flex-1 flex items-center gap-2 max-w-sm">
          <span className="text-sm font-medium text-zinc-600 whitespace-nowrap">Type:</span>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="profit">Profit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item 3: Search Button */}
        <Button onClick={handleSearch} disabled={loading} className="h-9 px-8 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </Button>
      </div>

      {/* ── Results Table ─────────────────────────────────────────────────── */}
      {hasSearched && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-zinc-50/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">
              {type.charAt(0).toUpperCase() + type.slice(1)} Transactions
            </h3>
            <span className={`text-sm font-medium px-3 py-1 rounded-md border shadow-sm bg-white ${
              type === 'profit' ? (totalAmount >= 0 ? 'text-green-600' : 'text-red-600') : 'text-zinc-700'
            }`}>
              Total: {totalAmount < 0 ? '-' : ''}${Math.abs(totalAmount).toFixed(2)}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
                    No transactions found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.uuid}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        type === 'profit' 
                          ? (t.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800') 
                          : 'bg-zinc-100 text-zinc-800'
                      }`}>
                        {t.source} {type === 'profit' && `(${t.type})`}
                      </span>
                    </TableCell>
                    <TableCell>{t.note}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={type === 'profit' ? (t.type === 'income' ? 'text-emerald-600' : 'text-rose-600') : ''}>
                        {type === 'profit' && t.type === 'expense' ? '-' : ''}${Number(t.amount).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Content Scaffolding ───────────────────────────────────────────── */}
      {!hasSearched && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">General Ledger</h3>
              <p className="text-sm text-zinc-500 mt-1">Overview of financial transactions and balances.</p>
            </div>
            <Button variant="ghost" className="w-full justify-between text-zinc-600 hover:text-blue-600 hover:bg-blue-50">
              View Ledger
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-4 shadow-sm border-dashed">
            <div className="flex items-center justify-center h-full min-h-[140px] text-center">
              <p className="text-sm text-zinc-400">Select a date range and type<br/>to view reports.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
