import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Eye, EyeOff, Brain, Zap, Shield, TrendingUp, Users, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Try to login first
      await api.login(email, password);
      // Verify role
      const user = await api.getCurrentUser();

      toast({
        title: "Welcome back!",
        description: `Signed in as ${user.full_name}`,
      });
      navigate("/");
    } catch (error) {
      // If login fails, try to register (Demo Mode Auto-Registration)
      try {
        console.log("Login failed, attempting auto-registration for demo...");
        await api.register({
          email,
          password,
          full_name: "Demo Recruiter",
          role: "recruiter",
          department: "HR"
        });

        // Login again after registration
        await api.login(email, password);

        toast({
          title: "Account Created",
          description: "New demo account created successfully!",
        });
        navigate("/");
      } catch (regError) {
        console.error(regError);
        toast({
          title: "Authentication Failed",
          description: "Could not sign in or create account. Please check credentials.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Brain, text: "AI-Powered Screening", delay: "0.1s" },
    { icon: Zap, text: "Instant Analysis", delay: "0.2s" },
    { icon: Shield, text: "Bias-Free Hiring", delay: "0.3s" },
    { icon: TrendingUp, text: "Success Prediction", delay: "0.4s" },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl animate-pulse-slow" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Left Panel - Branding & Features */}
      <div className={`hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-lg opacity-50 animate-pulse-slow" />
            <div className="relative gradient-ai rounded-xl p-3">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <span className="text-3xl font-display font-bold text-white tracking-tight">
            Hire<span className="gradient-ai-text">AI</span>
          </span>
        </div>

        {/* Main Content */}
        <div className="space-y-8 max-w-xl">
          <div className="space-y-4">
            <h1 className="text-5xl xl:text-6xl font-display font-bold text-white leading-tight">
              Revolutionize Your{" "}
              <span className="relative">
                <span className="gradient-ai-text">Hiring</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 10C50 3 150 3 198 10" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" className="animate-draw" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>{" "}
              Process
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed">
              Leverage AI-powered screening, intelligent matching, and predictive analytics
              to find the perfect candidates faster than ever.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-500 cursor-default ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: feature.delay }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-colors">
                    <feature.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-white">{feature.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-12 pt-4">
            <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-4xl font-display font-bold gradient-ai-text">85%</div>
              <div className="text-sm text-slate-500">Time Saved</div>
            </div>
            <div className={`transition-all duration-700 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-4xl font-display font-bold gradient-ai-text">3x</div>
              <div className="text-sm text-slate-500">Better Matches</div>
            </div>
            <div className={`transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-4xl font-display font-bold gradient-ai-text">50k+</div>
              <div className="text-sm text-slate-500">Hires Made</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <span>© 2026 HireAI</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>AI-Powered Recruitment</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className={`w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 relative z-10 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className="gradient-ai rounded-xl p-3">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white">
              Hire<span className="gradient-ai-text">AI</span>
            </span>
          </div>

          {/* Login Card */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-20 animate-pulse-slow" />

            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-medium text-cyan-400">AI-Powered Platform</span>
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-slate-400">Sign in to access your dashboard</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="hr@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 group-hover:border-slate-600"
                      required
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                      Password
                    </Label>
                    <button type="button" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 pr-12 group-hover:border-slate-600"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-slate-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
                  />
                  <label htmlFor="remember" className="text-sm text-slate-400">
                    Keep me signed in
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Sign In</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-slate-900 text-slate-500">or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-medium">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">SSO Login</span>
                </button>
              </div>

              {/* Demo Notice */}
              <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Demo Mode</p>
                    <p className="text-xs text-slate-500 mt-0.5">Any email/password combination works for testing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-slate-500 mt-8">
            Don't have an account?{" "}
            <button className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Request Access
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
