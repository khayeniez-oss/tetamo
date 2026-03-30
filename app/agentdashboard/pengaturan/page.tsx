"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAgentProfile } from "../layout";

type AgentFormProfile = {
  name?: string;
  number?: string;
  email?: string;
  agency?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  photo?: string;
};

export default function AgentPengaturanPage() {
  const { agent, setAgent, userId, loadingProfile } = useAgentProfile();
  const profile = (agent || {}) as AgentFormProfile;

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [agency, setAgency] = useState("");
  const [address, setAddress] = useState("");

  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(profile.name || "");
    setNumber(profile.number || "");
    setEmail(profile.email || "");
    setAgency(profile.agency || "");
    setAddress(profile.address || "");
    setInstagram(profile.instagram || "");
    setFacebook(profile.facebook || "");
    setTiktok(profile.tiktok || "");
    setYoutube(profile.youtube || "");
    setLinkedin(profile.linkedin || "");
    setPreviewPhotoUrl(profile.photo || "");
  }, [profile]);

  useEffect(() => {
    if (!selectedPhotoFile) return;

    const objectUrl = URL.createObjectURL(selectedPhotoFile);
    setPreviewPhotoUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoFile]);

  const currentPhoto = useMemo(() => {
    return previewPhotoUrl || profile.photo || "";
  }, [previewPhotoUrl, profile.photo]);

  function resetMessage() {
    setMessage("");
    setMessageType("");
  }

  function openPhotoPicker() {
    if (loadingProfile || saving || uploadingPhoto) return;
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
    if (!userId || !selectedPhotoFile) {
      return profile.photo || "";
    }

    setUploadingPhoto(true);

    try {
      const fileExt =
        selectedPhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${fileExt}`;

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
    if (!userId) {
      setMessageType("error");
      setMessage("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedNumber = number.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedAgency = agency.trim();
    const trimmedAddress = address.trim();

    const trimmedInstagram = instagram.trim();
    const trimmedFacebook = facebook.trim();
    const trimmedTiktok = tiktok.trim();
    const trimmedYoutube = youtube.trim();
    const trimmedLinkedin = linkedin.trim();

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
      let finalPhotoUrl = profile.photo || "";

      if (selectedPhotoFile) {
        finalPhotoUrl = await uploadProfilePhoto();

        if (!finalPhotoUrl) {
          throw new Error("Foto gagal disimpan. URL foto kosong.");
        }
      }

      const originalEmail = (profile.email || "").trim().toLowerCase();
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
          agency: trimmedAgency,
          address: trimmedAddress,
          photo_url: finalPhotoUrl,
          instagram_url: trimmedInstagram,
          facebook_url: trimmedFacebook,
          tiktok_url: trimmedTiktok,
          youtube_url: trimmedYoutube,
          linkedin_url: trimmedLinkedin,
        })
        .eq("id", userId);

      if (profileError) {
        setSaving(false);
        setMessageType("error");
        setMessage(profileError.message);
        return;
      }

      setAgent((prev: any) => ({
        ...(prev || {}),
        name: trimmedName,
        number: trimmedNumber,
        email: normalizedEmail,
        agency: trimmedAgency,
        address: trimmedAddress,
        photo: finalPhotoUrl,
        instagram: trimmedInstagram,
        facebook: trimmedFacebook,
        tiktok: trimmedTiktok,
        youtube: trimmedYoutube,
        linkedin: trimmedLinkedin,
      }));

      setSelectedPhotoFile(null);
      setPreviewPhotoUrl(finalPhotoUrl);

      setSaving(false);
      setMessageType("success");

      if (emailChanged) {
        setMessage(
          "Profil berhasil disimpan. Cek email Anda untuk konfirmasi perubahan email."
        );
      } else {
        setMessage("Profil berhasil disimpan.");
      }
    } catch (err) {
      console.error(err);
      setSaving(false);
      setMessageType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi."
      );
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Pengaturan</h1>
        <p className="text-sm text-gray-500">
          Kelola profil dan preferensi akun Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <input
            ref={fileInputRef}
            id="agent-photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={loadingProfile || saving || uploadingPhoto}
            className="hidden"
          />

          <button
            type="button"
            onClick={openPhotoPicker}
            disabled={loadingProfile || saving || uploadingPhoto}
            className="group block w-fit cursor-pointer disabled:cursor-not-allowed"
          >
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={profile.name || "Agent"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                  No Photo
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  Ubah
                </span>
              </div>
            </div>
          </button>

          <p className="mt-2 text-xs text-gray-500">
            Klik foto untuk upload. JPG, PNG, WEBP. Maksimal 5MB.
          </p>

          {selectedPhotoFile ? (
            <p className="mt-1 text-xs font-medium text-[#1C1C1E]">
              File dipilih: {selectedPhotoFile.name}
            </p>
          ) : null}

          <h2 className="mt-4 text-lg font-semibold text-[#1C1C1E]">
            {loadingProfile ? "Loading..." : profile.name || "-"}
          </h2>
          <p className="text-sm text-gray-500">
            {loadingProfile ? "Loading..." : profile.agency || "-"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {loadingProfile ? "Loading..." : profile.number || "-"}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-[#1C1C1E]">Profil Agent</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1C1C1E]">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingProfile || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1C1C1E]">
                Nomor WhatsApp
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={loadingProfile || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1C1C1E]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loadingProfile || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1C1C1E]">
                Nama Agency
              </label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                disabled={loadingProfile || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-[#1C1C1E]">
                Alamat
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loadingProfile || saving}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-[#1C1C1E]">Social Media</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tambahkan link social media Anda agar bisa digunakan di dashboard dan profil agent.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/username"
                    disabled={loadingProfile || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/username"
                    disabled={loadingProfile || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    TikTok
                  </label>
                  <input
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@username"
                    disabled={loadingProfile || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    YouTube
                  </label>
                  <input
                    type="text"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="https://youtube.com/@channel"
                    disabled={loadingProfile || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    disabled={loadingProfile || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-[#1C1C1E]">Notifikasi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Atur pemberitahuan yang ingin Anda terima.
              </p>

              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      Notifikasi Leads Baru
                    </p>
                    <p className="text-xs text-gray-500">
                      Dapatkan pemberitahuan saat ada calon buyer baru.
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      Pengingat Jadwal Viewing
                    </p>
                    <p className="text-xs text-gray-500">
                      Dapatkan pengingat untuk jadwal kunjungan properti.
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      Update Sistem
                    </p>
                    <p className="text-xs text-gray-500">
                      Dapatkan pemberitahuan pembaruan fitur dan status platform.
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </label>
              </div>
            </div>
          </div>

          {message ? (
            <div className="px-6 pb-2">
              <p
                className={`text-sm ${
                  messageType === "error" ? "text-red-600" : "text-green-600"
                }`}
              >
                {message}
              </p>
            </div>
          ) : null}

          <div className="px-6 pb-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loadingProfile || saving || uploadingPhoto}
              className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving || uploadingPhoto ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}