import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CHAD_PROVINCES, classifySeverity, type ReportCategory } from "@/lib/constants";
import { Loader2, MapPin, Camera, X, Crosshair } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/signaler")({
  head: () => ({
    meta: [
      { title: "Nouveau signalement | BATIR TCHAD" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SignalerPage,
});

function SignalerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("route");
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [latLng, setLatLng] = useState<[number, number] | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const open = params.get('openCamera');
      const lat = params.get('lat');
      const lng = params.get('lng');
      if (lat && lng) {
        const la = parseFloat(lat);
        const ln = parseFloat(lng);
        if (!Number.isNaN(la) && !Number.isNaN(ln)) {
          setLatLng([la, ln]);
        }
      }
      if (open && fileInputRef.current) {
        // programmatically open the file picker (mobile will prefer camera when capture attr present)
        fileInputRef.current.click();
      }
    } catch (e) {
      // ignore
    }
  }, []);
  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error(t("signaler.errGeoUnavailable"));
      return;
    }
    toast.info(t("signaler.locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatLng([pos.coords.latitude, pos.coords.longitude]);
        toast.success(t("signaler.positionDetected"));
      },
      () => toast.error(t("signaler.errPosition")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...list].slice(0, 6));
  }

  // generate object URL previews and clean them up when files change/unmount
  useEffect(() => {
    // revoke previous previews
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p));
      return [];
    });
    if (files.length === 0) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!latLng) { toast.error(t("signaler.errSelectLocation")); return; }
    if (!title || !description) { toast.error(t("signaler.errTitleDesc")); return; }

    setSubmitting(true);
    try {
      const severity = classifySeverity(category, description);
      const { data: report, error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        title, description, category, severity,
        latitude: latLng[0], longitude: latLng[1],
        province: province || null, city: city || null, address: address || null,
      }).select().single();
      if (error) throw error;

      // upload images
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${report.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("report-photos").upload(path, file);
        if (upErr) { console.error(upErr); continue; }
        await supabase.from("report_images").insert({
          report_id: report.id,
          storage_path: path,
        });
      }

      toast.success(t("signaler.sent"));
      navigate({ to: "/signalements/$id", params: { id: report.id } });
    } catch (err: any) {
  console.error("ERREUR ENVOI SIGNALEMENT :", err);

  const message =
    err?.message ||
    err?.details ||
    err?.hint ||
    "Erreur inconnue lors de l'envoi du signalement.";

  toast.error(message);
} finally {
  setSubmitting(false);
}  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="font-display text-3xl font-bold mb-2">{t("signaler.title")}</h1>
      <p className="text-muted-foreground mb-6">{t("signaler.subtitle")}</p>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("signaler.description")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("signaler.reportTitle")}</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("signaler.reportTitlePh")} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("signaler.categoryReq")}</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {t(`categories.${c.value}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("map.province")}</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger><SelectValue placeholder={t("profile.selectProvince")} /></SelectTrigger>
                  <SelectContent>
                    {CHAD_PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("signaler.cityVillage")}</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("signaler.addressLandmark")}</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">{t("signaler.descDetailed")}</Label>
              <Textarea id="desc" required rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={t("signaler.descPh")} />
              <p className="text-xs text-muted-foreground">{t("signaler.severityHint")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("signaler.locationReq")}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={detectLocation}>
                <Crosshair className="h-4 w-4 me-1" /> {t("signaler.myPosition")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{t("signaler.clickMap")}</p>
            <div className="h-80 rounded-lg overflow-hidden border">
              <MapView
                points={[]}
                center={latLng ?? [15.4, 18.7]}
                zoom={latLng ? 13 : 6}
                onMapClick={(lat, lng) => setLatLng([lat, lng])}
                selectedLatLng={latLng}
              />
            </div>
            {latLng && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {latLng[0].toFixed(5)}, {latLng[1].toFixed(5)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("signaler.photos")}</CardTitle></CardHeader>
          <CardContent>
            <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors" aria-hidden>
              <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-medium">{t("signaler.addPhotos")}</div>
              <div className="text-xs text-muted-foreground">{t("signaler.photoFormats")}</div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFiles} aria-label={t("signaler.addPhotos")} />
            </label>
            {files.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border group">
                    <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="absolute top-1 end-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/" })}>{t("common.cancel")}</Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t("signaler.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
