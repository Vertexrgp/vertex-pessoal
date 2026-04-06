import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="1,2 12,22 23,2 20,2 12,18 4,2" fill="white"/>
          </svg>
          <div className="flex flex-col leading-none">
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-lg tracking-tight">Vertex</span>
              <span className="text-white/30 font-light text-lg">|</span>
              <span className="text-white font-light text-lg tracking-tight">OS</span>
            </div>
            <span className="text-white/40 text-[9px] tracking-[0.18em] uppercase">Operating System</span>
          </div>
        </div>

        <div className="bg-[#111] border border-neutral-800 rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-1">Entrar na sua conta</h1>
          <p className="text-sm text-white/40 mb-7">Seu sistema operacional pessoal.</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Entrar
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <span className="text-sm text-white/40">Não tem conta?{" "}</span>
            <a href="/register" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Criar conta
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
