"use client";
import { useState, type FormEvent } from "react";
import { Leaf } from "lucide-react";
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
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    const result = signUp
      ? await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        })
      : await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(
        result.error.status === 429
          ? "ลองหลายครั้งเกินไป กรุณารอสักครู่"
          : (errorMessages[result.error.code ?? ""] ??
              "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"),
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
          <label>
            รหัสผ่าน
            <input
              type="password"
              autoComplete={signUp ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังดำเนินการ…" : signUp ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
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
