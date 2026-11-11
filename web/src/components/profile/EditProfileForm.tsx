"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { useTranslations } from "@/i18n/locale-provider";
import { changePassword, saveProfile } from "@/lib/api/profile-edit";
import type { ProfileData } from "@/lib/mock/profile";
import { useEffect, useRef, useState, type FormEvent } from "react";

const fieldClass =
  "h-[44px] w-full rounded-[10px] border border-[#5a5a5a] bg-[#1a1a1a] px-4 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/50";

export function EditProfileForm({ initial }: { initial: ProfileData }) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(initial.username);
  const [name, setName] = useState(initial.name);
  const [avatar, setAvatar] = useState(initial.avatar);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onPickAvatar = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAvatar(url);
    setAvatarFile(file);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim()) {
      setError(t("profileEdit.errorMissing"));
      setMessage(null);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveProfile({
        username: username.trim(),
        name: name.trim(),
        avatar,
        avatarFile,
      });
      setUsername(saved.username);
      setName(saved.name);
      setMessage(t("profileEdit.success"));
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : t("profileEdit.error"),
      );
    } finally {
      setSaving(false);
    }
  };


  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t("profileEdit.errorPasswordMissing"));
      setPasswordMessage(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profileEdit.errorPasswordMatch"));
      setPasswordMessage(null);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("profileEdit.errorPasswordLength"));
      setPasswordMessage(null);
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      await changePassword({
        currentPassword,
        password: newPassword,
        passwordConfirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(t("profileEdit.passwordSuccess"));
    } catch (err) {
      setPasswordError(
        err instanceof Error && err.message
          ? err.message
          : t("profileEdit.errorPassword"),
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="anim-fade-up px-6 pt-6 pb-8">
    <form onSubmit={(event) => void onSubmit(event)}>
      <div className="flex flex-col items-center">
        <button
          type="button"
          aria-label={t("profileEdit.avatarAria")}
          className="relative size-[96px]"
          onClick={() => fileRef.current?.click()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/avatar-ring.svg"
            alt=""
            width={96}
            height={96}
            className="pointer-events-none absolute inset-0 size-full"
          />
          <span className="absolute top-1/2 left-1/2 size-[84px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-[#3a3a3a]">
            {avatar ? (
              previewUrl ? (
                // Local object URLs are not valid next/image sources.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="size-full object-cover object-top" />
              ) : (
                <SafeImage
                  src={avatar}
                  alt=""
                  fill
                  sizes="84px"
                  className="object-cover object-top"
                />
              )
            ) : null}
          </span>
          <span className="absolute right-0 bottom-0 flex size-[28px] items-center justify-center rounded-full bg-[#d01f25] ring-2 ring-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/icon-edit.svg" alt="" width={14} height={14} />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onPickAvatar(event.target.files?.[0])}
        />
      </div>

      <label className="mt-8 block text-[13px] font-bold text-white/70" htmlFor="profile-edit-username">
        {t("profileEdit.nickname")}
      </label>
      <input
        id="profile-edit-username"
        className={`${fieldClass} mt-2`}
        value={username}
        placeholder={t("profileEdit.nicknamePlaceholder")}
        autoComplete="username"
        onChange={(event) => setUsername(event.target.value)}
      />

      <label className="mt-5 block text-[13px] font-bold text-white/70" htmlFor="profile-edit-name">
        {t("profileEdit.name")}
      </label>
      <input
        id="profile-edit-name"
        className={`${fieldClass} mt-2`}
        value={name}
        placeholder={t("profileEdit.namePlaceholder")}
        autoComplete="name"
        onChange={(event) => setName(event.target.value)}
      />

      {error ? (
        <p className="mt-4 text-[13px] font-bold text-[#f0454a]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-[13px] font-bold text-[#fda565]" role="status">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="anim-press anim-btn-shimmer mt-8 flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#d01f25] text-[16px] leading-none font-bold text-white disabled:opacity-70"
      >
        {saving ? t("profileEdit.saving") : t("profileEdit.save")}
      </button>
    
    </form>

      <form className="mt-10 border-t border-white/10 pt-8" onSubmit={(event) => void onChangePassword(event)}>
        <h2 className="text-[16px] leading-none font-bold text-white">
          {t("profileEdit.passwordTitle")}
        </h2>

        <label className="mt-5 block text-[13px] font-bold text-white/70" htmlFor="profile-edit-current-password">
          {t("profileEdit.currentPassword")}
        </label>
        <input
          id="profile-edit-current-password"
          type="password"
          autoComplete="current-password"
          className={`${fieldClass} mt-2`}
          value={currentPassword}
          placeholder={t("profileEdit.currentPasswordPlaceholder")}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />

        <label className="mt-5 block text-[13px] font-bold text-white/70" htmlFor="profile-edit-new-password">
          {t("profileEdit.newPassword")}
        </label>
        <input
          id="profile-edit-new-password"
          type="password"
          autoComplete="new-password"
          className={`${fieldClass} mt-2`}
          value={newPassword}
          placeholder={t("profileEdit.newPasswordPlaceholder")}
          onChange={(event) => setNewPassword(event.target.value)}
        />

        <label className="mt-5 block text-[13px] font-bold text-white/70" htmlFor="profile-edit-confirm-password">
          {t("profileEdit.confirmPassword")}
        </label>
        <input
          id="profile-edit-confirm-password"
          type="password"
          autoComplete="new-password"
          className={`${fieldClass} mt-2`}
          value={confirmPassword}
          placeholder={t("profileEdit.confirmPasswordPlaceholder")}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {passwordError ? (
          <p className="mt-4 text-[13px] font-bold text-[#f0454a]" role="alert">
            {passwordError}
          </p>
        ) : null}
        {passwordMessage ? (
          <p className="mt-4 text-[13px] font-bold text-[#fda565]" role="status">
            {passwordMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={passwordSaving}
          className="anim-press anim-btn-shimmer mt-6 flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#c62828] text-[16px] leading-none font-bold text-white disabled:opacity-70"
        >
          {passwordSaving ? t("profileEdit.passwordSaving") : t("profileEdit.passwordSave")}
        </button>
      </form>
    </div>
  );
}
