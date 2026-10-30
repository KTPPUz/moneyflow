"use client";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  INVALID_EMAIL: "รูปแบบอีเมลไม่ถูกต้อง",
  PASSWORD_TOO_SHORT: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  USER_ALREADY_EXISTS: "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ",
  EMAIL_PASSWORD_SIGN_UP_DISABLED: "ระบบปิดรับสมัครบัญชีใหม่แล้ว",
};
export function LoginScreen() {
  const [signUp, setSignUp] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (signUp && !name.trim()) {
      setError("กรุณากรอกชื่อที่แสดง");
      return;
    }
    if (signUp && password !== confirmation) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setPending(true);
    setError("");
    const result = signUp
      ? await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
        })
      : await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(
        result.error.status === 429
          ? "ลองหลายครั้งเกินไป กรุณารอสักครู่"
          : (result.error.status ?? 500) >= 500
            ? "เชื่อมต่อระบบหรือฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้งภายหลัง"
            : (errorMessages[result.error.code ?? ""] ??
              (signUp
                ? "สร้างบัญชีไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง"
                : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง")),
      );
      setPending(false);
      return;
    }
    window.location.assign("/dashboard");
  };
  return (
    <main className="auth-page">
      <Card className="auth-card">
        <span className="brand-mark">
          <Leaf size={25} />
        </span>
        <h1>{signUp ? "สร้างบัญชี MoneyFlow" : "เข้าสู่ระบบ MoneyFlow"}</h1>
        <p>ข้อมูลการเงินของคุณเก็บในฐานข้อมูลและเปิดได้จากทุกอุปกรณ์</p>
        <form className="editor-form" onSubmit={submit}>
          {signUp && (
            <label>
              ชื่อที่แสดง
              <input
                autoComplete="name"
                maxLength={60}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <label>
            อีเมล
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="password-field">
            <label>
              รหัสผ่าน
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={signUp ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              type="button"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {signUp && (
            <label>
              ยืนยันรหัสผ่าน
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending
              ? "กำลังดำเนินการ…"
              : signUp
                ? "สร้างบัญชี"
                : "เข้าสู่ระบบ"}
          </Button>
        </form>
        <Button
          variant="ghost"
          onClick={() => {
            setSignUp(!signUp);
            setError("");
          }}
        >
          {signUp ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สร้างบัญชี"}
        </Button>
      </Card>
    </main>
  );
}
