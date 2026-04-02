"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminProfile } from "../layout";

type SettingsState = {
  platformName: string;
  commissionRate: string;
  contactEmail: string;
  supportPhone: string;
  aiAutomation: boolean;
  maintenanceMode: boolean;
};

type PlatformSettingsRow = {
  id: string;
  platform_name: string | null;
  commission_rate: number | null;
  contact_email: string | null;
  support_phone: string | null;
  ai_automation: boolean | null;
  maintenance_mode: boolean | null;
};

type AdminProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
};

const DEFAULT_ADMIN_PHOTO =
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=300&q=80";

export default function AdminSettingsPage() {
  const { admin, setAdmin, platformSettings, setPlatformSettings } =
    useAdminProfile();

  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");

  const [settings, setSettings] = useState<SettingsState>({
    platformName: "Tetamo",
    commissionRate: "10",
    contactEmail: "",
    supportPhone: "",
    aiAutomation: true,
    maintenanceMode: false,
  });

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function updateSetting<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetMessage() {
    setMessage("");
    setMessageType("");
  }

  useEffect(() => {
    let ignore = false;

    async function loadSettingsAndProfile() {
      setLoading(true);

      try {
        const [settingsResult, authResult] = await Promise.all([
          supabase
            .from("platform_settings")
            .select(
              "id, platform_name, commission_rate, contact_email, support_phone, ai_automation, maintenance_mode"
            )
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);

        if (ignore) return;

        if (settingsResult.error) {
          console.error("Failed to load settings:", settingsResult.error);
        } else {
          const row = settingsResult.data as PlatformSettingsRow | null;

          if (row) {
            setSettingsId(row.id);
            const nextSettings = {
              platformName: row.platform_name ?? "Tetamo",
              commissionRate:
                row.commission_rate !== null && row.commission_rate !== undefined
                  ? String(row.commission_rate)
                  : "10",
              contactEmail: row.contact_email ?? "",
              supportPhone: row.support_phone ?? "",
              aiAutomation: Boolean(row.ai_automation),
              maintenanceMode: Boolean(row.maintenance_mode),
            };

            setSettings(nextSettings);
            setPlatformSettings({
              platformName: nextSettings.platformName,
              supportPhone: nextSettings.supportPhone,
              contactEmail: nextSettings.contactEmail,
            });
          } else {
            setSettings({
              platformName: platformSettings.platformName || "Tetamo",
              commissionRate: "10",
              contactEmail: platformSettings.contactEmail || "",
              supportPhone: platformSettings.supportPhone || "",
              aiAutomation: true,
              maintenanceMode: false,
            });
          }
        }

        const user = authResult.data.user;
        if (!user) {
          setLoading(false);
          return;
        }

        setAdminUserId(user.id);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email, photo_url")
          .eq("id", user.id)
          .maybeSingle();

        if (ignore) return;

        if (profileError) {
          console.error("Failed to load admin profile:", profileError);
        }

        const profile = profileData as AdminProfileRow | null;

        const nextName =
          profile?.full_name ||
          user.user_metadata?.full_name ||
          admin.name ||
          "Tetamo Admin";

        const nextNumber = profile?.phone || admin.number || "";
        const nextEmail = profile?.email || user.email || admin.email || "";
        const nextPhoto = profile?.photo_url || admin.photo || DEFAULT_ADMIN_PHOTO;

        setName(nextName);
        setNumber(nextNumber);
        setEmail(nextEmail);
        setPreviewPhotoUrl(nextPhoto);

        setAdmin((prev) => ({
          ...prev,
          name: nextName,
          number: nextNumber,
          email: nextEmail,
          photo: nextPhoto,
        }));
      } catch (error) {
        console.error("Unexpected settings/profile load error:", error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSettingsAndProfile();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPhotoFile) return;

    const objectUrl = URL.createObjectURL(selectedPhotoFile);
    setPreviewPhotoUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoFile]);

  const currentPhoto = useMemo(() => {
    return previewPhotoUrl || admin.photo || DEFAULT_ADMIN_PHOTO;
  }, [previewPhotoUrl, admin.photo]);

  function openPhotoPicker() {
    if (loading || saving || uploadingPhoto) return;
    fileInputRef.current?.click();
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessageType("error");
      setMessage("File harus berupa gambar.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Ukuran foto maksimal 5MB.");
      return;
    }

    resetMessage();
    setSelectedPhotoFile(file);
    e.target.value = "";
  }

  async function uploadProfilePhoto() {
    if (!adminUserId || !selectedPhotoFile) {
      return admin.photo || DEFAULT_ADMIN_PHOTO;
    }

    setUploadingPhoto(true);

    try {
      const fileExt =
        selectedPhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${adminUserId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, selectedPhotoFile, {
          upsert: true,
          contentType: selectedPhotoFile.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl || "";

      if (!publicUrl) {
        throw new Error(
          "Upload berhasil tetapi URL foto kosong. Cek bucket profile-photos."
        );
      }

      return publicUrl;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!adminUserId) {
      setMessageType("error");
      setMessage("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedNumber = number.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setMessageType("error");
      setMessage("Nama lengkap wajib diisi.");
      return;
    }

    if (!normalizedEmail) {
      setMessageType("error");
      setMessage("Email wajib diisi.");
      return;
    }

    setSaving(true);
    resetMessage();

    try {
      let finalPhotoUrl = admin.photo || DEFAULT_ADMIN_PHOTO;

      if (selectedPhotoFile) {
        finalPhotoUrl = await uploadProfilePhoto();

        if (!finalPhotoUrl) {
          throw new Error("Foto gagal disimpan. URL foto kosong.");
        }
      }

      const originalEmail = (admin.email || "").trim().toLowerCase();
      const emailChanged =
        normalizedEmail.length > 0 && normalizedEmail !== originalEmail;

      if (emailChanged) {
        const { error: authEmailError } = await supabase.auth.updateUser({
          email: normalizedEmail,
        });

        if (authEmailError) {
          setSaving(false);
          setMessageType("error");
          setMessage(authEmailError.message);
          return;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          phone: trimmedNumber,
          email: normalizedEmail,
          photo_url: finalPhotoUrl,
        })
        .eq("id", adminUserId);

      if (profileError) {
        setSaving(false);
        setMessageType("error");
        setMessage(profileError.message);
        return;
      }

      const payload = {
        platform_name: settings.platformName.trim(),
        commission_rate: settings.commissionRate
          ? Number(settings.commissionRate)
          : 0,
        contact_email: settings.contactEmail.trim() || null,
        support_phone: settings.supportPhone.trim() || null,
        ai_automation: settings.aiAutomation,
        maintenance_mode: settings.maintenanceMode,
        updated_by: adminUserId,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error } = await supabase
          .from("platform_settings")
          .update(payload)
          .eq("id", settingsId);

        if (error) {
          console.error("Failed to update settings:", error);
          setSaving(false);
          setMessageType("error");
          setMessage(error.message || "Failed to save settings.");
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("platform_settings")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          console.error("Failed to insert settings:", error);
          setSaving(false);
          setMessageType("error");
          setMessage(error.message || "Failed to save settings.");
          return;
        }

        setSettingsId(data.id);
      }

      setAdmin({
        name: trimmedName,
        role: admin.role,
        number: trimmedNumber,
        photo: finalPhotoUrl,
        email: normalizedEmail,
      });

      setPlatformSettings({
        platformName: settings.platformName.trim(),
        supportPhone: settings.supportPhone.trim(),
        contactEmail: settings.contactEmail.trim(),
      });

      setSelectedPhotoFile(null);
      setPreviewPhotoUrl(finalPhotoUrl);

      window.dispatchEvent(
        new CustomEvent("tetamo-platform-settings-updated", {
          detail: {
            platformName: settings.platformName.trim(),
            supportPhone: settings.supportPhone.trim(),
            contactEmail: settings.contactEmail.trim(),
          },
        })
      );

      window.dispatchEvent(
        new CustomEvent("tetamo-admin-profile-updated", {
          detail: {
            photoUrl: finalPhotoUrl,
            fullName: trimmedName,
          },
        })
      );

      setSaving(false);
      setMessageType("success");

      if (emailChanged) {
        setMessage(
          "Profil berhasil disimpan. Cek email Anda untuk konfirmasi perubahan email."
        );
      } else {
        setMessage("Profil berhasil disimpan.");
      }
    } catch (error: any) {
      console.error("Save settings error:", error);
      setSaving(false);
      setMessageType("error");
      setMessage(
        error?.message || "Something went wrong while saving settings."
      );
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Pengaturan
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Kelola profil admin dan pengaturan platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <input
            ref={fileInputRef}
            id="admin-photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={loading || saving || uploadingPhoto}
            className="hidden"
          />

          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={openPhotoPicker}
              disabled={loading || saving || uploadingPhoto}
              className="group block w-fit shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 sm:h-24 sm:w-24">
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={name || "Admin"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                    No Photo
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    Ubah
                  </span>
                </div>
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {loading ? "Loading..." : name || "-"}
              </h2>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-xs md:text-sm">
                {loading ? "Loading..." : admin.role || "-"}
              </p>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-xs md:text-sm">
                {loading ? "Loading..." : number || "-"}
              </p>
              <p className="mt-2 text-[10px] leading-5 text-gray-500 sm:text-[11px]">
                Klik foto untuk upload. JPG, PNG, WEBP. Maksimal 5MB.
              </p>

              {selectedPhotoFile ? (
                <p className="mt-1 text-[10px] font-medium text-[#1C1C1E] sm:text-[11px]">
                  File dipilih: {selectedPhotoFile.name}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Profil Admin
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-4 sm:gap-4 sm:p-5">
            <div>
              <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                Nomor WhatsApp
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={loading || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="border-t border-gray-100 pt-4 sm:pt-5">
              <h3 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                Platform Settings
              </h3>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-xs md:text-sm">
                Konfigurasi utama sistem Tetamo.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={settings.platformName}
                    onChange={(e) =>
                      updateSetting("platformName", e.target.value)
                    }
                    disabled={loading || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                    Agent Commission (%)
                  </label>
                  <input
                    type="number"
                    value={settings.commissionRate}
                    onChange={(e) =>
                      updateSetting("commissionRate", e.target.value)
                    }
                    disabled={loading || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) =>
                      updateSetting("contactEmail", e.target.value)
                    }
                    disabled={loading || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#1C1C1E] sm:text-sm">
                    Support Phone
                  </label>
                  <input
                    type="text"
                    value={settings.supportPhone}
                    onChange={(e) =>
                      updateSetting("supportPhone", e.target.value)
                    }
                    disabled={loading || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[12px] outline-none focus:border-[#1C1C1E] disabled:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="border-t border-gray-100 pt-4 sm:pt-5">
              <h3 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                Notifikasi Sistem
              </h3>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-xs md:text-sm">
                Atur fitur dan status platform.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                      AI Automation
                    </p>
                    <p className="text-[10px] leading-5 text-gray-500 sm:text-xs">
                      Enable AI lead response and automation
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.aiAutomation}
                    onChange={(e) =>
                      updateSetting("aiAutomation", e.target.checked)
                    }
                    disabled={loading || saving}
                    className="shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                      Maintenance Mode
                    </p>
                    <p className="text-[10px] leading-5 text-gray-500 sm:text-xs">
                      Disable public access temporarily
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      updateSetting("maintenanceMode", e.target.checked)
                    }
                    disabled={loading || saving}
                    className="shrink-0"
                  />
                </label>
              </div>
            </div>
          </div>

          {message ? (
            <div className="px-4 pb-2 sm:px-5">
              <p
                className={`text-[12px] sm:text-sm ${
                  messageType === "error" ? "text-red-600" : "text-green-600"
                }`}
              >
                {message}
              </p>
            </div>
          ) : null}

          <div className="flex justify-end px-4 pb-4 sm:px-5 sm:pb-5">
            <button
              onClick={handleSave}
              disabled={loading || saving || uploadingPhoto}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:h-11 sm:px-5 sm:text-sm"
            >
              <Save size={15} />
              <span>{saving || uploadingPhoto ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}