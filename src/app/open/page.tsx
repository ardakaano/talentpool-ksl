"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { TalentRecord, TalentFields, AirtableResponse } from "@/lib/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, ExternalLink, Tag } from "lucide-react";

function getField(f: Record<string, unknown>, name: string): string {
  const val = f[name];
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "boolean") return val ? "Var" : "Yok";
  if (val == null) return "-";
  return String(val);
}

export default function OpenPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [records, setRecords] = useState<TalentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/airtable");
      if (!res.ok) throw new Error("API error");
      const data: AirtableResponse = await res.json();
      setRecords(data.records);
      setError(null);
    } catch {
      setError("Veri çekilirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeRecords = useMemo(() => records.filter((r) => {
    const f = r.fields as TalentFields;
    return !f["Delist"] && f["Agency Safe"] === true;
  }), [records]);

  const uniqueTags = useMemo(() => {
    const tags: Record<string, number> = {};
    for (const r of activeRecords) {
      const t = (r.fields as TalentFields)["Tag"];
      if (Array.isArray(t)) for (const tag of t) tags[tag] = (tags[tag] || 0) + 1;
    }
    return Object.keys(tags).sort();
  }, [activeRecords]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeRecords.filter((r) => {
      const f = r.fields as TalentFields;
      const name = (f["Ad-Soyad"] || "").toLowerCase();
      if (q && !name.includes(q)) return false;
      if (filterTags.length > 0 && (!Array.isArray(f["Tag"]) || !f["Tag"].some((t) => filterTags.includes(t)))) return false;
      return true;
    });
  }, [activeRecords, search, filterTags]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.valid) {
        setAuthenticated(true);
        sessionStorage.setItem("tp_open_auth", "1");
      } else {
        setAuthError("Geçersiz şifre");
      }
    } catch {
      setAuthError("Bağlantı hatası");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("tp_open_auth") === "1") {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }
  }, []);

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#00174a]/5 to-[#00174a]/10">
        <Card className="w-full max-w-sm mx-4 shadow-xl border-[#00174a]/10">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00174a] to-[#002d8a] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00174a]/20">
                <Users className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-[#00174a]">TalentPool</h1>
              <p className="text-sm text-muted-foreground mt-1">Ajans & Marka Portali</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="password"
                placeholder="Erişim şifresi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-sm"
                autoFocus
              />
              {authError && <p className="text-sm text-red-500">{authError}</p>}
              <Button type="submit" className="w-full h-11 bg-[#00174a] hover:bg-[#00174a]/90" disabled={authLoading}>
                {authLoading ? "Kontrol ediliyor..." : "Giriş Yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="text-center p-8">
          <p className="text-destructive text-lg font-semibold">{error}</p>
          <Button onClick={fetchData} className="mt-4">Tekrar Dene</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00174a]/[0.03]">
      <header className="bg-[#00174a] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">TalentPool</h1>
              <p className="text-xs text-white/60">{activeRecords.length} içerik üreticisi</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-5">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="İsim ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Tag:</span>
              {uniqueTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${filterTags.includes(t) ? "bg-[#00174a] text-white border-[#00174a]" : "bg-white text-muted-foreground border-border hover:border-primary/30"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>İçerik Üreticileri</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {filtered.length} / {activeRecords.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Ad Soyad</TableHead>
                  <TableHead className="text-xs">Tag</TableHead>
                  <TableHead className="text-xs w-20">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Sonuç bulunamadı</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r, i) => {
                    const f = r.fields as Record<string, unknown>;
                    const link = getField(f, "Ana mecradaki hesabınız");
                    const hasLink = link !== "-";
                    return (
                      <TableRow key={r.id} className="transition-colors hover:bg-muted/50">
                        <TableCell className="text-xs text-muted-foreground w-10">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-sm">{getField(f, "Ad-Soyad")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(Array.isArray(f["Tag"]) ? f["Tag"] as string[] : []).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] border-primary/20 text-primary">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasLink ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#00174a] hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Profil
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
