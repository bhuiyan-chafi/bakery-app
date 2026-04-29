import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-toastify';
import { APP_NAME, API_BASE_URL } from '@/config/constants';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken'>('idle');
  const navigate = useNavigate();

  // Debounced username checking
  useEffect(() => {
    const checkUsername = async () => {
      const trimmed = username.trim();
      if (!trimmed) {
        setUsernameStatus('idle');
        return;
      }
      
      // Basic validity check: no spaces
      if (/\s/.test(trimmed)) {
        setUsernameStatus('taken'); // Re-using 'taken' for generic invalid state
        return;
      }

      setIsCheckingUsername(true);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus(data.available ? 'available' : 'taken');
        } else {
          setUsernameStatus('idle');
        }
      } catch (err) {
        setUsernameStatus('idle');
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password || !name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (/\s/.test(username.trim())) {
      toast.error("Username cannot contain spaces");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (usernameStatus === 'taken') {
      toast.error("Username is not available");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: name.trim(), 
          username: username.trim(), 
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      toast.success(data.message || "Registration successful! Please wait for approval.");
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] p-4">
      <Card className="w-full max-w-sm border-none shadow-lg">
        <CardHeader className="space-y-4 flex flex-col items-center pb-2">
          <div className="w-24 h-24 mb-2 rounded-full overflow-hidden border border-zinc-100 shadow-inner bg-white flex items-center justify-center p-2">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-light tracking-tight text-center">
            Join {APP_NAME}
          </CardTitle>
          <p className="text-sm text-zinc-500 text-center">
            Create an account to access the system.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Enter your full name" 
                className="bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input 
                  id="username" 
                  placeholder="Choose a username" 
                  className={`bg-white pr-10 ${
                    usernameStatus === 'available' ? 'border-emerald-500 focus-visible:ring-emerald-500' : 
                    usernameStatus === 'taken' ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  disabled={isLoading}
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {isCheckingUsername ? (
                    <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
                  ) : usernameStatus === 'available' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : usernameStatus === 'taken' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-xs text-red-500">Username is taken or invalid (no spaces).</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-xs text-emerald-500">Username is available!</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Create a password"
                className="bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="Confirm your password"
                className="bg-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-black text-white hover:bg-zinc-800 h-12 text-lg font-normal transition-all rounded-md mt-2"
              disabled={isLoading || usernameStatus === 'taken' || isCheckingUsername}
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
          <div className="flex items-center justify-center pt-6 border-t mt-6">
            <p className="text-sm text-zinc-500">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-black hover:underline transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
