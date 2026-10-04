import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGN_EXPIRY = 60 * 60 * 24 * 7; // 7 days

async function isAdminOrAuthority(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r) => r.role === "admin" || r.role === "authority");
}

export const getMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("id,title,category,severity,status,city,province,created_at")
      .eq("reporter_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdminOrAuthority(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("id,title,category,severity,status,province,city,created_at,reporter_id,description,latitude,longitude,address,resolution_note,reviewed_at,reviewed_by")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdminOrAuthority(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Fetch profiles
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,phone,province,city,created_at")
      .order("created_at", { ascending: false });
    if (profErr) throw new Error(profErr.message);

    // Fetch user roles
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    
    // Fetch reports to count per user
    const { data: reports } = await supabaseAdmin.from("reports").select("reporter_id");

    const roleMap: Record<string, string> = {};
    for (const r of roles ?? []) {
      roleMap[r.user_id] = r.role;
    }

    const reportCountMap: Record<string, number> = {};
    for (const rep of reports ?? []) {
      if (rep.reporter_id) {
        reportCountMap[rep.reporter_id] = (reportCountMap[rep.reporter_id] ?? 0) + 1;
      }
    }

    return (profiles ?? []).map((p) => ({
      ...p,
      role: roleMap[p.id] ?? "citizen",
      reportCount: reportCountMap[p.id] ?? 0,
    }));
  });

export const adminUpdateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ targetUserId: z.string().uuid(), newRole: z.enum(["citizen", "authority", "admin"]) }))
  .handler(async ({ data, context }) => {
    if (!(await isAdminOrAuthority(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert role
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.targetUserId, role: data.newRole }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * Privileged detail: returns exact coordinates, address, reporter info, resolution note.
 * Only the report owner and admins/authorities are allowed.
 */
export const getReportPrivileged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) return null;
    const isOwner = report.reporter_id === context.userId;
    const elevated = isOwner || (await isAdminOrAuthority(context.userId));
    if (!elevated) throw new Error("Forbidden");
    return report;
  });

export const getReportImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report } = await supabaseAdmin
      .from("reports").select("reporter_id").eq("id", data.id).maybeSingle();
    if (!report) return [] as { id: string; storage_path: string }[];
    const elevated = report.reporter_id === context.userId || (await isAdminOrAuthority(context.userId));
    if (!elevated) throw new Error("Forbidden");
    const { data: imgs, error } = await supabaseAdmin
      .from("report_images")
      .select("id,storage_path")
      .eq("report_id", data.id);
    if (error) throw new Error(error.message);
    return imgs ?? [];
  });

export const getReportHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report } = await supabaseAdmin
      .from("reports").select("reporter_id").eq("id", data.id).maybeSingle();
    if (!report) return [];
    const isAdmin = await isAdminOrAuthority(context.userId);
    const isOwner = report.reporter_id === context.userId;
    if (!isOwner && !isAdmin) throw new Error("Forbidden");
    const { data: hist, error } = await supabaseAdmin
      .from("report_status_history")
      .select("id,report_id,old_status,new_status,note,created_at,changed_by")
      .eq("report_id", data.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Redact actor for non-admins (still owner).
    return (hist ?? []).map((h) => isAdmin ? h : { ...h, changed_by: null });
  });

export const signReportPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ paths: z.array(z.string()).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    if (data.paths.length === 0) return {} as Record<string, string>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only sign paths that belong to a stored image AND the caller is owner/admin of that report.
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from("report_images")
      .select("storage_path, reports!inner(reporter_id)")
      .in("storage_path", data.paths);
    if (rowsErr) throw new Error(rowsErr.message);

    const isAdmin = await isAdminOrAuthority(context.userId);
    const allowed = (rows ?? [])
      .filter((r: any) => isAdmin || r.reports?.reporter_id === context.userId)
      .map((r: any) => r.storage_path as string);
    if (allowed.length === 0) return {} as Record<string, string>;

    const { data: signed, error } = await supabaseAdmin.storage
      .from("report-photos")
      .createSignedUrls(allowed, SIGN_EXPIRY);
    if (error) throw new Error(error.message);

    const result: Record<string, string> = {};
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) result[s.path] = s.signedUrl;
    }
    return result;
  });

export const adminUpdateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      reportId: z.string().uuid(),
      newStatus: z.enum(["signale", "verifie", "en_cours", "resolu", "rejete"]),
      note: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdminOrAuthority(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch current status
    const { data: currentReport, error: fetchErr } = await supabaseAdmin
      .from("reports")
      .select("status")
      .eq("id", data.reportId)
      .single();
    if (fetchErr || !currentReport) throw new Error("Report not found");

    const oldStatus = currentReport.status;

    // Update report
    const { error: updateErr } = await supabaseAdmin
      .from("reports")
      .update({
        status: data.newStatus,
        resolution_note: data.note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.reportId);
    if (updateErr) throw new Error(updateErr.message);

    // Record history
    await supabaseAdmin.from("report_status_history").insert({
      report_id: data.reportId,
      old_status: oldStatus,
      new_status: data.newStatus,
      note: data.note || null,
      changed_by: context.userId,
    });

    return { success: true };
  });

