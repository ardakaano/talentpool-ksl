"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { TalentRecord, TalentFields, BrandFields, AirtableResponse } from "@/lib/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw, Search, Users, TrendingUp, Star, Tag, MapPin, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Sparkles, Loader2,
  Mail, Globe, Phone, ExternalLink, FileText, Heart, Briefcase, ShieldOff, Share2, Building2,
} from "lucide-react";

interface Stats {
  total: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  delisted: number;
  tags: Record<string, number>;
  platforms: Record<string, number>;
  cities: Record<string, number>;
  genders: Record<string, number>;
}

function computeStats(records: TalentRecord[]): Stats {
  const stats: Stats = { total: records.length, highPriority: 0, mediumPriority: 0, lowPriority: 0, delisted: 0, tags: {}, platforms: {}, cities: {}, genders: {} };
  for (const r of records) {
    const f = r.fields as TalentFields;
    const p = f["Öncelik"];
    if (p === "Yüksek") stats.highPriority++;
    else if (p === "Orta") stats.mediumPriority++;
    else if (p === "Düşük") stats.lowPriority++;
    if (f["Delist"]) stats.delisted++;
    const tags = f["Tag"];
    if (Array.isArray(tags)) for (const t of tags) stats.tags[t] = (stats.tags[t] || 0) + 1;
    const platform = f["Ana sosyal medya mecranız"];
    if (platform) stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
    const city = f["Yaşadığınız Şehir"];
    if (city) stats.cities[city] = (stats.cities[city] || 0) + 1;
    const gender = f["Cinsiyet"];
    if (gender) stats.genders[gender] = (stats.genders[gender] || 0) + 1;
  }
  return stats;
}

const PRIORITY_ORDER: Record<string, number> = { Yüksek: 0, Orta: 1, Düşük: 2 };

function getField(f: Record<string, unknown>, name: string): string {
  const val = f[name];
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "boolean") return val ? "✓" : "✗";
  if (val == null) return "-";
  return String(val);
}

export default function Dashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [records, setRecords] = useState<TalentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterPlatform, setFilterPlatform] = useState<string>("");
  const [filterDelist, setFilterDelist] = useState<string>("active");
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [detailRecord, setDetailRecord] = useState<TalentRecord | null>(null);
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [improvedTexts, setImprovedTexts] = useState<Record<string, string>>({});
  const [improveError, setImproveError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<"influencer" | "brands" | "agencySafe">("influencer");
  const [brands, setBrands] = useState<TalentRecord[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandFilterSektor, setBrandFilterSektor] = useState<string>("");
  const [brandFilterDurum, setBrandFilterDurum] = useState<string>("");
  const [brandFilterOdak, setBrandFilterOdak] = useState<string[]>([]);
  const [agencySafe, setAgencySafe] = useState<TalentRecord[]>([]);
  const [agencySafeLoading, setAgencySafeLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/airtable");
      if (!res.ok) throw new Error("API error");
      const data: AirtableResponse = await res.json();
      setRecords(data.records);
      setLastRefresh(new Date());
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

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  const fetchBrands = useCallback(async () => {
    try {
      setBrandsLoading(true);
      const res = await fetch("/api/brands");
      if (!res.ok) throw new Error("API error");
      const data: AirtableResponse = await res.json();
      setBrands(data.records);
    } catch {
      // silent
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "brands") fetchBrands();
  }, [activeTab, fetchBrands]);

  useEffect(() => {
    if (!autoRefresh || activeTab !== "brands") return;
    const interval = setInterval(fetchBrands, 30000);
    return () => clearInterval(interval);
  }, [fetchBrands, autoRefresh, activeTab]);

  const fetchAgencySafe = useCallback(async () => {
    try {
      setAgencySafeLoading(true);
      const res = await fetch("/api/agency-safe");
      if (!res.ok) throw new Error("API error");
      const data: AirtableResponse = await res.json();
      setAgencySafe(data.records);
    } catch {
      // silent
    } finally {
      setAgencySafeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh || activeTab !== "agencySafe") return;
    const interval = setInterval(fetchAgencySafe, 30000);
    return () => clearInterval(interval);
  }, [fetchAgencySafe, autoRefresh, activeTab]);  const stats = useMemo(() => computeStats(records), [records]);
  const uniqueTags = useMemo(() => Object.keys(stats.tags).sort(), [stats.tags]);
  const uniquePlatforms = useMemo(() => Object.keys(stats.platforms).sort(), [stats.platforms]);
  const uniqueCities = useMemo(() => Object.keys(stats.cities).sort(), [stats.cities]);
  const uniqueGenders = useMemo(() => Object.keys(stats.genders).sort(), [stats.genders]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const f = r.fields as TalentFields;
      const q = search.toLowerCase();
      if (q) {
        const name = (f["Ad-Soyad"] || "").toLowerCase();
        const email = (f["Email"] || "").toLowerCase();
        const content = (f["Ana içerik kategorisi"] || "").toLowerCase();
        const about = (f["İçerikler hk."] || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !content.includes(q) && !about.includes(q)) return false;
      }
      if (filterPriority && f["Öncelik"] !== filterPriority) return false;
      if (filterTags.length > 0 && (!Array.isArray(f["Tag"]) || !f["Tag"].some((t) => filterTags.includes(t)))) return false;
      if (filterGender && f["Cinsiyet"] !== filterGender) return false;
      if (filterCity && f["Yaşadığınız Şehir"] !== filterCity) return false;
      if (filterPlatform && f["Ana sosyal medya mecranız"] !== filterPlatform) return false;
      if (filterDelist === "active" && f["Delist"]) return false;
      if (filterDelist === "delisted" && !f["Delist"]) return false;
      return true;
    });
  }, [records, search, filterPriority, filterTags, filterGender, filterCity, filterPlatform, filterDelist]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const fa = a.fields as TalentFields;
      const fb = b.fields as TalentFields;
      let va = (fa as Record<string, unknown>)[sortField] ?? "";
      let vb = (fb as Record<string, unknown>)[sortField] ?? "";
      if (sortField === "Öncelik") { va = PRIORITY_ORDER[String(va)] ?? 99; vb = PRIORITY_ORDER[String(vb)] ?? 99; }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const hasActiveFilters = search || filterPriority || filterTags.length > 0 || filterGender || filterCity || filterPlatform || filterDelist !== "active";

  const brandSektors = useMemo(() => {
    const s: Record<string, number> = {};
    for (const b of brands) {
      const sektor = (b.fields as BrandFields)["Sektör"];
      if (sektor) s[sektor] = (s[sektor] || 0) + 1;
    }
    return Object.keys(s).sort();
  }, [brands]);

  const brandOdaks = useMemo(() => {
    const o: Record<string, number> = {};
    for (const b of brands) {
      const odak = (b.fields as BrandFields)["Odak"];
      if (Array.isArray(odak)) for (const t of odak) o[t] = (o[t] || 0) + 1;
    }
    return Object.entries(o).sort((a, b) => b[1] - a[1]);
  }, [brands]);

  const brandStats = useMemo(() => {
    let aktif = 0, pasif = 0, anlasma = 0;
    for (const b of brands) {
      const durum = (b.fields as BrandFields)["Durum"];
      if (durum === "Aktif") aktif++;
      else if (durum === "Pasif") pasif++;
      else if (durum === "Anlaşma Süreci") anlasma++;
    }
    return { total: brands.length, aktif, pasif, anlasma };
  }, [brands]);

  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const f = b.fields as BrandFields;
      const q = brandSearch.toLowerCase();
      if (q) {
        const name = (f["Marka Adı"] || "").toLowerCase();
        const sektor = (f["Sektör"] || "").toLowerCase();
        if (!name.includes(q) && !sektor.includes(q)) return false;
      }
      if (brandFilterSektor && f["Sektör"] !== brandFilterSektor) return false;
      if (brandFilterDurum && f["Durum"] !== brandFilterDurum) return false;
      if (brandFilterOdak.length > 0 && (!Array.isArray(f["Odak"]) || !f["Odak"].some((t) => brandFilterOdak.includes(t)))) return false;
      return true;
    });
  }, [brands, brandSearch, brandFilterSektor, brandFilterDurum, brandFilterOdak]);

  const hasActiveBrandFilters = brandSearch || brandFilterSektor || brandFilterDurum || brandFilterOdak.length > 0;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.valid) {
        setAuthenticated(true);
        sessionStorage.setItem("tp_auth", "1");
      } else {
        setAuthError("Yanlış şifre");
      }
    } catch {
      setAuthError("Bağlantı hatası");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("tp_auth") === "1") {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }
  }, []);

  const handleImprove = async (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;
    const text = getField(record.fields as Record<string, unknown>, "İçerikler hk.");
    if (!text || text === "-") return;

    setImprovingId(recordId);
    setImproveError(null);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, recordId, save: true }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setImprovedTexts((prev) => ({ ...prev, [recordId]: data.improved }));
      if (data.saved) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, fields: { ...r.fields, "İçerikler hk.": data.improved } }
              : r
          )
        );
      }
    } catch {
      setImproveError("İyileştirme başarısız oldu");
    } finally {
      setImprovingId(null);
    }
  };

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#00174a]/[0.03]">
        <Card className="w-full max-w-sm mx-4">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#00174a] text-white flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-[#00174a]">TalentPool</h1>
              <p className="text-sm text-muted-foreground mt-1">Devam etmek için şifreni gir</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="password"
                placeholder="Şifre"
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
      {/* Top Nav */}
      <header className="bg-[#00174a] text-white px-6 pt-4 pb-0 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">TalentPool</h1>
              <p className="text-xs text-white/60">{activeTab === "influencer" ? `${stats.total} influencer` : activeTab === "brands" ? `${brandStats.total} marka` : `${agencySafe.length} agency safe`}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition ${autoRefresh ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"}`}
            >
              <span className={`relative flex h-2 w-2 ${autoRefresh ? "" : "opacity-30"}`}>
                {autoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? "bg-green-400" : "bg-white/30"}`} />
              </span>
              {autoRefresh ? "Canlı (30sn)" : "Duraklatıldı"}
            </button>
            <Button variant="ghost" size="sm" onClick={() => { if (activeTab === "influencer") fetchData(); else if (activeTab === "brands") fetchBrands(); else fetchAgencySafe(); }} className="text-white/80 hover:text-white hover:bg-white/10 gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Yenile</span>
            </Button>
            {lastRefresh && (
              <span className="text-xs text-white/40 hidden md:block">
                Son: {lastRefresh.toLocaleTimeString("tr-TR")}
              </span>
            )}
          </div>
        </div>
        <div className="max-w-[1800px] mx-auto flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab("influencer")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${activeTab === "influencer" ? "bg-white text-[#00174a]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            Influencer
          </button>
          <button
            onClick={() => setActiveTab("brands")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-1.5 ${activeTab === "brands" ? "bg-white text-[#00174a]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Markalar
          </button>
          <button
            onClick={() => { setActiveTab("agencySafe"); fetchAgencySafe(); }}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-1.5 ${activeTab === "agencySafe" ? "bg-white text-[#00174a]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Agency Safe
          </button>
        </div>
      </header>

      {activeTab === "influencer" && (
      <>
      <div className="max-w-[1800px] mx-auto p-4 md:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Toplam" value={stats.total} icon={Users} />
          <StatCard label="Yüksek" value={stats.highPriority} icon={TrendingUp} variant="danger" />
          <StatCard label="Orta" value={stats.mediumPriority} icon={Star} variant="warning" />
          <StatCard label="Düşük" value={stats.lowPriority} icon={ChevronDown} variant="success" />
          <StatCard label="Mikro" value={stats.tags["Mikro"] || 0} icon={Tag} variant="info" />
          <StatCard label="Delist" value={stats.delisted} icon={ShieldAlert} variant="danger" />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Delist Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Durum:</span>
              {[
                { key: "active", label: "Aktif", count: stats.total - stats.delisted },
                { key: "all", label: "Tümü", count: stats.total },
                { key: "delisted", label: "Delist", count: stats.delisted },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterDelist(filterDelist === key ? "active" : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${filterDelist === key ? (key === "delisted" ? "bg-red-600 text-white border-red-600" : key === "active" ? "bg-green-600 text-white border-green-600" : "bg-[#00174a] text-white border-[#00174a]") : "bg-white text-muted-foreground border-border hover:border-primary/30"}`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <div className="relative sm:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="İsim, email veya içerik ile ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v || "")}>
                <SelectTrigger><SelectValue placeholder="Öncelik" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Öncelikler</SelectItem>
                  <SelectItem value="Yüksek">Yüksek</SelectItem>
                  <SelectItem value="Orta">Orta</SelectItem>
                  <SelectItem value="Düşük">Düşük</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v || "")}>
                <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Platformlar</SelectItem>
                  {uniquePlatforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterCity} onValueChange={(v) => setFilterCity(v || "")}>
                <SelectTrigger><SelectValue placeholder="Şehir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şehirler</SelectItem>
                  {uniqueCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterGender} onValueChange={(v) => setFilterGender(v || "")}>
                <SelectTrigger><SelectValue placeholder="Cinsiyet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Cinsiyetler</SelectItem>
                  {uniqueGenders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Tags multi-select */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Tag:</span>
              {uniqueTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${filterTags.includes(t) ? "bg-[#00174a] text-white border-[#00174a]" : "bg-white text-muted-foreground border-border hover:border-primary/30"}`}
                >
                  {t} ({stats.tags[t]})
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto"
                onClick={() => { setSearch(""); setFilterPriority(""); setFilterTags([]); setFilterGender(""); setFilterCity(""); setFilterPlatform(""); setFilterDelist("active"); }}
              >
                Filtreleri temizle
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Influencer Listesi</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {sorted.length} / {records.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  {[
                    { key: "Ad-Soyad", label: "Ad Soyad" },
                    { key: "Öncelik", label: "Öncelik" },
                    { key: "Tag", label: "Tag" },
                    { key: "Ana sosyal medya mecranız", label: "Platform" },
                    { key: "Cinsiyet", label: "Cinsiyet" },
                    { key: "Yaşadığınız Şehir", label: "Şehir" },
                    { key: "Ana içerik kategorisi", label: "İçerik Kategorisi" },
                    { key: "Email", label: "Email" },
                    { key: "Delist", label: "Delist" },
                  ].map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-xs cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => col.key !== "Tag" && toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.key !== "Tag" && (
                          <span className="flex flex-col -space-y-1">
                            <ChevronUp className={`w-3 h-3 ${sortField === col.key && sortDir === "asc" ? "text-primary" : "text-muted-foreground/30"}`} />
                            <ChevronDown className={`w-3 h-3 ${sortField === col.key && sortDir === "desc" ? "text-primary" : "text-muted-foreground/30"}`} />
                          </span>
                        )}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Sonuç bulunamadı</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((r, i) => {
                    const f = r.fields as Record<string, unknown>;
                    const isDelisted = f["Delist"] as boolean;
                    return (
                      <TableRow
                        key={r.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${isDelisted ? "opacity-60" : ""}`}
                        onClick={() => setDetailRecord(r)}
                      >
                        <TableCell className="text-xs text-muted-foreground w-10">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px]">{getField(f, "Ad-Soyad")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const p = getField(f, "Öncelik");
                            const v: Record<string, "destructive" | "default" | "secondary"> = { Yüksek: "destructive", Orta: "default", Düşük: "secondary" };
                            return <Badge variant={v[p] || "secondary"} className="text-[10px]">{p}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(Array.isArray(f["Tag"]) ? f["Tag"] as string[] : []).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] border-primary/20 text-primary">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{getField(f, "Ana sosyal medya mecranız")}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{getField(f, "Cinsiyet")}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {getField(f, "Yaşadığınız Şehir")}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{getField(f, "Ana içerik kategorisi")?.length > 50 ? getField(f, "Ana içerik kategorisi").slice(0, 50) + "..." : getField(f, "Ana içerik kategorisi")}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <a
                            href={`mailto:${getField(f, "Email")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:underline truncate max-w-[180px] block"
                          >
                            {getField(f, "Email")}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isDelisted ? "destructive" : "outline"} className={`text-[10px] ${!isDelisted ? "border-green-300 text-green-600" : ""}`}>
                            {isDelisted ? "Delist" : "Aktif"}
                          </Badge>
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

      {/* Detail Dialog - Centered */}
      <Dialog open={!!detailRecord} onOpenChange={(open) => { if (!open) { setDetailRecord(null); setImproveError(null); } }}>
        <DialogContent className="w-full sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {detailRecord && (() => {
            const f = detailRecord.fields as Record<string, unknown>;
            const isDelisted = f["Delist"] as boolean;
            const name = getField(f, "Ad-Soyad");
            const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

            return (
              <>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#00174a] text-white px-6 py-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center text-xl font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-bold truncate">{name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {Array.isArray(f["Tag"]) && (f["Tag"] as string[]).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px] border-white/30 text-white/80 bg-white/10">{t}</Badge>
                      ))}
                      <Badge variant={isDelisted ? "destructive" : "outline"} className={`text-[10px] ${!isDelisted ? "border-green-400 text-green-300 bg-green-400/10" : ""}`}>
                        {isDelisted ? "Delist" : "Aktif"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Quick Info */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <InfoBadge icon={Mail} label="Email" value={getField(f, "Email")} href={`mailto:${getField(f, "Email")}`} />
                    <InfoBadge icon={Globe} label="Platform" value={getField(f, "Ana sosyal medya mecranız")} />
                    <InfoBadge icon={MapPin} label="Şehir" value={getField(f, "Yaşadığınız Şehir")} />
                    <InfoBadge icon={Phone} label="Telefon" value={getField(f, "İletişim telefon numaranız")} />
                  </div>

                  {/* Account Link */}
                  {getField(f, "Ana mecradaki hesabınız") !== "-" && (
                    <a href={getField(f, "Ana mecradaki hesabınız")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00174a]/5 text-[#00174a] text-sm font-semibold hover:bg-[#00174a]/10 transition border border-[#00174a]/10">
                      <ExternalLink className="w-4 h-4" /> Profile Git
                    </a>
                  )}

                  {/* İçerik Hakkında */}
                  <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#00174a]/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#00174a]" />
                        </div>
                        <h3 className="font-semibold text-base">İçerik Hakkında</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs gap-1.5 border-[#00174a]/20 text-[#00174a] hover:bg-[#00174a]/5 font-medium"
                        disabled={improvingId === detailRecord.id}
                        onClick={() => handleImprove(detailRecord.id)}
                      >
                        {improvingId === detailRecord.id ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> İyileştiriliyor...</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5" /> AI ile İyileştir ve Kaydet</>
                        )}
                      </Button>
                    </div>
                    <p className="text-base leading-[1.7] text-muted-foreground whitespace-pre-wrap">
                      {getField(f, "İçerikler hk.")}
                    </p>
                    {improvedTexts[detailRecord.id] && (
                      <div className="p-5 rounded-lg bg-emerald-50/80 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-700">AI İyileştirilmiş & Airtable'a kaydedildi</span>
                        </div>
                        <p className="text-base text-emerald-900 leading-[1.7] whitespace-pre-wrap">
                          {improvedTexts[detailRecord.id]}
                        </p>
                      </div>
                    )}
                    {improveError && (
                      <p className="text-xs text-red-500">{improveError}</p>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SectionCard icon={Tag} title="Ana İçerik Kategorisi" content={getField(f, "Ana içerik kategorisi")} />
                    <SectionCard icon={Heart} title="Tercih Edilen Sektörler" content={getField(f, "Hangi sektörlerle işbirliği yapmaktan daha çok keyif alırsınız?")} />
                    <SectionCard icon={Briefcase} title="Daha Önce Çalışılan Markalar" content={getField(f, "Daha önce çalışılan markalar")} />
                    <SectionCard icon={ShieldOff} title="İstenmeyen Marka Kategorileri" content={getField(f, "Çalışmak istemediğiniz marka kategorileri var mı? Varsa nedenleri nelerdir?")} />
                    {getField(f, "Diğer Aktif Olduğunuz Sosyal Medya Platformları ve Kullanıcı Adları") !== "-" && (
                      <SectionCard icon={Share2} title="Diğer Platformlar" content={getField(f, "Diğer Aktif Olduğunuz Sosyal Medya Platformları ve Kullanıcı Adları")} full />
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border flex-wrap">
                    <span>Öncelik: <Badge variant={getField(f, "Öncelik") === "Yüksek" ? "destructive" : getField(f, "Öncelik") === "Orta" ? "default" : "secondary"}>{getField(f, "Öncelik")}</Badge></span>
                    <span>Cinsiyet: {getField(f, "Cinsiyet")}</span>
                    <span>Barter: {getField(f, "Barter (ürün gönderimi) kampanyalarda da yer almak ister misiniz?")}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      </>
      )}

      {activeTab === "brands" && (
      <div className="max-w-[1800px] mx-auto p-4 md:p-6 space-y-5">
        {/* Brand Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Toplam" value={brandStats.total} icon={Building2} />
          <StatCard label="Aktif" value={brandStats.aktif} icon={TrendingUp} variant="success" />
          <StatCard label="Pasif" value={brandStats.pasif} icon={ShieldAlert} variant="danger" />
          <StatCard label="Anlaşma Süreci" value={brandStats.anlasma} icon={Star} variant="warning" />
        </div>

        {/* Brand Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Durum:</span>
              {[
                { key: "", label: "Tümü", count: brandStats.total },
                { key: "Aktif", label: "Aktif", count: brandStats.aktif },
                { key: "Pasif", label: "Pasif", count: brandStats.pasif },
                { key: "Anlaşma Süreci", label: "Anlaşma", count: brandStats.anlasma },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setBrandFilterDurum(brandFilterDurum === key ? "" : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${brandFilterDurum === key ? (key === "Pasif" ? "bg-red-600 text-white border-red-600" : key === "Aktif" ? "bg-green-600 text-white border-green-600" : key === "Anlaşma Süreci" ? "bg-amber-600 text-white border-amber-600" : "bg-[#00174a] text-white border-[#00174a]") : "bg-white text-muted-foreground border-border hover:border-primary/30"}`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Marka veya sektör ara..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={brandFilterSektor} onValueChange={(v) => setBrandFilterSektor(v || "")}>
                <SelectTrigger><SelectValue placeholder="Sektör" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Sektörler</SelectItem>
                  {brandSektors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Odak:</span>
              {brandOdaks.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setBrandFilterOdak((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${brandFilterOdak.includes(name) ? "bg-[#00174a] text-white border-[#00174a]" : "bg-white text-muted-foreground border-border hover:border-primary/30"}`}
                >
                  {name} ({count})
                </button>
              ))}
            </div>

            {hasActiveBrandFilters && (
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto"
                onClick={() => { setBrandSearch(""); setBrandFilterSektor(""); setBrandFilterDurum(""); setBrandFilterOdak([]); }}
              >
                Filtreleri temizle
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Brand Table */}
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Marka Listesi</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {brandsLoading ? "..." : `${filteredBrands.length} / ${brands.length}`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Marka Adı</TableHead>
                  <TableHead className="text-xs">Sektör</TableHead>
                  <TableHead className="text-xs">Odak</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Sonuç bulunamadı</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrands.map((b, i) => {
                    const f = b.fields as BrandFields;
                    const durum = f["Durum"];
                    return (
                      <TableRow key={b.id} className="transition-colors hover:bg-muted/50">
                        <TableCell className="text-xs text-muted-foreground w-10">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-sm">{f["Marka Adı"] || "-"}</TableCell>
                        <TableCell className="text-xs">{f["Sektör"] || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(Array.isArray(f["Odak"]) ? f["Odak"] as string[] : []).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] border-primary/20 text-primary">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const v: Record<string, "destructive" | "default" | "secondary"> = { Aktif: "default", Pasif: "destructive", "Anlaşma Süreci": "secondary" };
                            return <Badge variant={durum ? (v[durum] || "default") : "default"} className="text-[10px]">{durum || "-"}</Badge>;
                          })()}
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
      )}

      {activeTab === "agencySafe" && (
      <div className="max-w-[1800px] mx-auto p-4 md:p-6 space-y-5">
        {/* Agency Safe Table */}
        <Card className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Agency Safe Listesi
              </span>
              <Badge variant="secondary" className="text-xs font-normal">
                {agencySafeLoading ? "..." : agencySafe.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Ad</TableHead>
                  <TableHead className="text-xs">Tag</TableHead>
                  <TableHead className="text-xs">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencySafe.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldCheck className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Sonuç bulunamadı</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  agencySafe.map((r, i) => {
                    const f = r.fields as Record<string, unknown>;
                    const link = getField(f, "Ana mecradaki hesabınız");
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => setDetailRecord(r)}
                      >
                        <TableCell className="text-xs text-muted-foreground w-10">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{getField(f, "Ad-Soyad")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(Array.isArray(f["Tag"]) ? f["Tag"] as string[] : []).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] border-primary/20 text-primary">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {link !== "-" ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline max-w-[240px] truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{link}</span>
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
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, variant = "default" }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; variant?: "default" | "danger" | "warning" | "success" | "info" }) {
  const styles = {
    default: { bg: "bg-white", iconBg: "bg-primary/10", iconColor: "text-primary", accent: "border-l-primary" },
    danger: { bg: "bg-white", iconBg: "bg-red-50", iconColor: "text-red-500", accent: "border-l-red-500" },
    warning: { bg: "bg-white", iconBg: "bg-amber-50", iconColor: "text-amber-500", accent: "border-l-amber-500" },
    success: { bg: "bg-white", iconBg: "bg-emerald-50", iconColor: "text-emerald-500", accent: "border-l-emerald-500" },
    info: { bg: "bg-white", iconBg: "bg-sky-50", iconColor: "text-sky-500", accent: "border-l-sky-500" },
  };
  const s = styles[variant];
  return (
    <Card className={`${s.bg} border-l-4 ${s.accent} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBadge({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-[#00174a]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#00174a]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{label}</p>
        {href ? (
          <a href={href} className="text-sm font-semibold text-[#00174a] hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm font-semibold truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, content, full }: { icon: React.ComponentType<{ className?: string }>; title: string; content: string; full?: boolean }) {
  if (content === "-" || !content) return null;
  return (
    <div className={`rounded-lg border border-border/50 bg-muted/30 p-5 ${full ? "lg:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#00174a]/60" />
        <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      </div>
      <p className="text-sm leading-[1.6] whitespace-pre-wrap">{content}</p>
    </div>
  );
}
