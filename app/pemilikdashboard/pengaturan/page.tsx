"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { supabase } from "@/lib/supabase";
import { useOwnerProfile } from "../layout";
import { useLanguage } from "@/app/context/LanguageContext";

export default function PemilikPengaturanPage() {
  const { owner, setOwner, userId, loadingProfile } = useOwnerProfile();
  const { lang } = useLanguage();

  const isID = lang === "id";

  const t = {
    pageTitle: isID ? "Pengaturan" : "Settings",
    pageSubtitle: isID
      ? "Kelola profil dan preferensi akun Anda."
      : "Manage your profile and account preferences.",

    noPhoto: isID ? "Belum Ada Foto" : "No Photo",
    changePhoto: isID ? "Ubah Foto" : "Change Photo",
    photoHint: isID
      ? "Klik foto untuk upload. JPG, PNG, WEBP. Maksimal 5MB."
      : "Click the photo to upload. JPG, PNG, WEBP. Maximum 5MB.",
    selectedFile: isID ? "File dipilih:" : "Selected file:",
    loading: "Loading...",

    profileOwner: isID ? "Profil Pemilik" : "Owner Profile",
    fullName: isID ? "Nama Lengkap" : "Full Name",
    whatsappNumber: isID ? "Nomor WhatsApp" : "WhatsApp Number",
    email: "Email",
    agencyName: isID ? "Nama Agency" : "Agency Name",
    address: isID ? "Alamat" : "Address",

    socialMedia: isID ? "Social Media" : "Social Media",
    socialMediaDesc: isID
      ? "Tambahkan link social media Anda agar bisa digunakan di dashboard dan profil owner."
      : "Add your social media links so they can be used in the dashboard and owner profile.",

    notifications: isID ? "Notifikasi" : "Notifications",
    notificationsDesc: isID
      ? "Atur pemberitahuan yang ingin Anda terima."
      : "Set the notifications you want to receive.",

    newLeadNotif: isID ? "Notifikasi Leads Baru" : "New Lead Notifications",
    newLeadNotifDesc: isID
      ? "Dapatkan pemberitahuan saat ada calon pembeli baru."
      : "Get notified when there is a new potential buyer.",

    adRenewalReminder: isID
      ? "Pengingat Perpanjangan Iklan"
      : "Ad Renewal Reminder",
    adRenewalReminderDesc: isID
      ? "Dapatkan pengingat saat iklan mendekati masa kadaluarsa."
      : "Get reminders when your ad is close to expiring.",

    paymentUpdates: isID ? "Update Pembayaran" : "Payment Updates",
    paymentUpdatesDesc: isID
      ? "Dapatkan pemberitahuan status pembayaran dan tagihan."
      : "Get notified about payment and invoice status.",

    saveChanges: isID ? "Simpan Perubahan" : "Save Changes",
    saving: isID ? "Menyimpan..." : "Saving...",

    invalidImage: isID
      ? "File harus berupa gambar."
      : "The file must be an image.",
    maxPhotoSize: isID
      ? "Ukuran foto maksimal 5MB."
      : "Maximum photo size is 5MB.",
    uploadEmptyUrl: isID
      ? "Upload berhasil tetapi URL foto kosong. Cek bucket profile-photos."
      : "Upload succeeded but the photo URL is empty. Check the profile-photos bucket.",
    userNotFound: isID
      ? "User tidak ditemukan. Silakan login ulang."
      : "User not found. Please log in again.",
    fullNameRequired: isID
      ? "Nama lengkap wajib diisi."
      : "Full name is required.",
    emailRequired: isID ? "Email wajib diisi." : "Email is required.",
    photoSaveFailed: isID
      ? "Foto gagal disimpan. URL foto kosong."
      : "Photo failed to save. Photo URL is empty.",
    profileSaved: isID ? "Profil berhasil disimpan." : "Profile saved successfully.",
    profileSavedEmailChanged: isID
      ? "Profil berhasil disimpan. Cek email Anda untuk konfirmasi perubahan email."
      : "Profile saved successfully. Please check your email to confirm the email change.",
    genericError: isID
      ? "Terjadi kesalahan. Silakan coba lagi."
      : "Something went wrong. Please try again.",

    ownerFallback: isID ? "Pemilik" : "Owner",
  };

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [agency, setAgency] = useState("");
  const [address, setAddress] = useState("");

  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(owner.name || "");
    setNumber(owner.number || "");
    setEmail(owner.email || "");
    setAgency(owner.agency || "");
    setAddress(owner.address || "");
    setInstagramUrl(owner.instagramUrl || "");
    setFacebookUrl(owner.facebookUrl || "");
    setTiktokUrl(owner.tiktokUrl || "");
    setYoutubeUrl(owner.youtubeUrl || "");
    setLinkedinUrl(owner.linkedinUrl || "");
    setPreviewPhotoUrl(owner.photo || "");
  }, [owner]);

  useEffect(() => {
    if (!selectedPhotoFile) return;

    const objectUrl = URL.createObjectURL(selectedPhotoFile);
    setPreviewPhotoUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoFile]);

  const currentPhoto = useMemo(() => {
    return previewPhotoUrl || owner.photo || "";
  }, [previewPhotoUrl, owner.photo]);

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
      setMessage(t.invalidImage);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageType("error");
      setMessage(t.maxPhotoSize);
      return;
    }

    resetMessage();
    setSelectedPhotoFile(file);

    e.target.value = "";
  }

  async function uploadProfilePhoto() {
    if (!userId || !selectedPhotoFile) {
      return owner.photo || "";
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
        throw new Error(t.uploadEmptyUrl);
      }

      return publicUrl;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!userId) {
      setMessageType("error");
      setMessage(t.userNotFound);
      return;
    }

    const trimmedName = name.trim();
    const trimmedNumber = number.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedAgency = agency.trim();
    const trimmedAddress = address.trim();

    const trimmedInstagramUrl = instagramUrl.trim();
    const trimmedFacebookUrl = facebookUrl.trim();
    const trimmedTiktokUrl = tiktokUrl.trim();
    const trimmedYoutubeUrl = youtubeUrl.trim();
    const trimmedLinkedinUrl = linkedinUrl.trim();

    if (!trimmedName) {
      setMessageType("error");
      setMessage(t.fullNameRequired);
      return;
    }

    if (!normalizedEmail) {
      setMessageType("error");
      setMessage(t.emailRequired);
      return;
    }

    setSaving(true);
    resetMessage();

    try {
      let finalPhotoUrl = owner.photo || "";

      if (selectedPhotoFile) {
        finalPhotoUrl = await uploadProfilePhoto();

        if (!finalPhotoUrl) {
          throw new Error(t.photoSaveFailed);
        }
      }

      const originalEmail = (owner.email || "").trim().toLowerCase();
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
          instagram_url: trimmedInstagramUrl,
          facebook_url: trimmedFacebookUrl,
          tiktok_url: trimmedTiktokUrl,
          youtube_url: trimmedYoutubeUrl,
          linkedin_url: trimmedLinkedinUrl,
        })
        .eq("id", userId);

      if (profileError) {
        setSaving(false);
        setMessageType("error");
        setMessage(profileError.message);
        return;
      }

      setOwner((prev) => ({
        ...prev,
        name: trimmedName,
        number: trimmedNumber,
        email: normalizedEmail,
        agency: trimmedAgency,
        address: trimmedAddress,
        photo: finalPhotoUrl,
        instagramUrl: trimmedInstagramUrl,
        facebookUrl: trimmedFacebookUrl,
        tiktokUrl: trimmedTiktokUrl,
        youtubeUrl: trimmedYoutubeUrl,
        linkedinUrl: trimmedLinkedinUrl,
      }));

      setSelectedPhotoFile(null);
      setPreviewPhotoUrl(finalPhotoUrl);

      setSaving(false);
      setMessageType("success");
      setMessage(emailChanged ? t.profileSavedEmailChanged : t.profileSaved);
    } catch (err) {
      console.error(err);
      setSaving(false);
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : t.genericError);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">{t.pageTitle}</h1>
        <p className="text-sm text-gray-500">{t.pageSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <input
            ref={fileInputRef}
            id="owner-photo-upload"
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
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={owner.name || t.ownerFallback}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-400">
                  {t.noPhoto}
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {t.changePhoto}
                </span>
              </div>
            </div>
          </button>

          <p className="mt-2 text-xs text-gray-500">{t.photoHint}</p>

          {selectedPhotoFile ? (
            <p className="mt-1 text-xs font-medium text-[#1C1C1E]">
              {t.selectedFile} {selectedPhotoFile.name}
            </p>
          ) : null}

          <h2 className="mt-4 text-lg font-semibold text-[#1C1C1E]">
            {loadingProfile ? t.loading : owner.name || "-"}
          </h2>
          <p className="text-sm text-gray-500">
            {loadingProfile ? t.loading : owner.agency || "-"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {loadingProfile ? t.loading : owner.number || "-"}
          </p>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="font-semibold text-[#1C1C1E]">{t.profileOwner}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#1C1C1E]">
                {t.fullName}
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
                {t.whatsappNumber}
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
                {t.email}
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
                {t.agencyName}
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
                {t.address}
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
              <h3 className="font-semibold text-[#1C1C1E]">{t.socialMedia}</h3>
              <p className="mt-1 text-sm text-gray-500">{t.socialMediaDesc}</p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
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
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
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
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
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
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/@channel"
                    disabled={loadingProfile || saving}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] disabled:bg-gray-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-[#1C1C1E]">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
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
              <h3 className="font-semibold text-[#1C1C1E]">{t.notifications}</h3>
              <p className="mt-1 text-sm text-gray-500">{t.notificationsDesc}</p>

              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      {t.newLeadNotif}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.newLeadNotifDesc}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      {t.adRenewalReminder}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.adRenewalReminderDesc}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1C1C1E]">
                      {t.paymentUpdates}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.paymentUpdatesDesc}
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

          <div className="flex justify-end px-6 pb-6">
            <button
              onClick={handleSave}
              disabled={loadingProfile || saving || uploadingPhoto}
              className="rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving || uploadingPhoto ? t.saving : t.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}