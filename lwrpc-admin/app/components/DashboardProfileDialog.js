"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { roleLabel } from "../lib/permissions";
import { APP_VERSION } from "../lib/version";
import LmsInstallButton from "./LmsInstallButton";
import styles from "../design-preview/page.module.css";
import { DashboardAppearanceControls, useDashboardAppearance } from "../design-preview/DashboardAppearanceControls";

const paths = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3" /></>,
  external: <><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v6H5V6h6" /></>,
  logout: <><path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9" /></>,
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function displayName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || person?.full_name || person?.email || "Member";
}

function initialsFor(person) {
  return displayName(person).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
}

function profilePhotoUrl(person) {
  const urls = Array.isArray(person?.profile_image_urls) ? person.profile_image_urls : [];
  return urls.find((url) => String(url).includes("/storage/v1/object/public/profile-photos/")) || "";
}

function Avatar({ person, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageUrl]);

  return (
    <span className={`${styles.avatar} ${styles.userAvatar} ${styles.coral}`}>
      {imageUrl && !imageFailed
        ? <Image src={imageUrl} width={80} height={80} alt={`${displayName(person)} profile`} onError={() => setImageFailed(true)} unoptimized />
        : initialsFor(person)}
    </span>
  );
}

export default function DashboardProfileDialog({
  isOpen,
  onClose,
  member,
  role,
  membershipUrl,
  onChangePassword,
  onSaveProfileImage,
  onLogout,
}) {
  const appearance = useDashboardAppearance();
  const photoInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [profileImageMessage, setProfileImageMessage] = useState("");
  const [profileImageSaving, setProfileImageSaving] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const savedProfileImage = profilePhotoUrl(member);
  const displayedProfileImage = profileImage || savedProfileImage;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) return;
    setProfileImageError("");
    setProfileImageMessage("");
    setLogoutConfirmOpen(false);
    setLogoutError("");
  }, [isOpen]);

  async function handleProfileImage(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setProfileImageError("");
    setProfileImageMessage("");
    if (!file) return;
    if (!onSaveProfileImage) {
      setProfileImageError("Profile picture updates are unavailable right now.");
      input.value = "";
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileImageError("Choose a JPG, PNG, or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > 2_000_000) {
      setProfileImageError("Choose an image smaller than 2 MB.");
      input.value = "";
      return;
    }

    const previousImage = profileImage;
    setProfileImageSaving(true);
    try {
      const previewUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("The selected picture could not be read."));
        reader.readAsDataURL(file);
      });
      setProfileImage(previewUrl);
      const savedUrl = await onSaveProfileImage(file);
      setProfileImage(savedUrl || previewUrl);
      setProfileImageMessage("Profile picture saved.");
    } catch (error) {
      setProfileImage(previousImage);
      setProfileImageError(error?.message || "Unable to save the profile picture.");
    } finally {
      setProfileImageSaving(false);
      input.value = "";
    }
  }

  async function confirmLogout() {
    setLogoutPending(true);
    setLogoutError("");
    try {
      await onLogout?.();
    } catch (error) {
      setLogoutError(error?.message || "Unable to log out. Please try again.");
      setLogoutPending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
        <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Close profile" />
        <section className={styles.profileDialog}>
          <header>
            <Avatar person={member} imageUrl={displayedProfileImage} />
            <div>
              <span>Signed-in profile</span>
              <h2 id="profile-dialog-title">{displayName(member)}</h2>
              <p>{roleLabel(role)}{member?.email ? ` · ${member.email}` : ""}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close profile">×</button>
          </header>
          <div className={styles.profileActions}>
            <button type="button" onClick={onChangePassword}>
              <Icon name="lock" />
              <span><strong>Change Password</strong><small>Update the password for this account</small></span>
              <Icon name="arrow" size={17} />
            </button>
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={profileImageSaving}>
              <Icon name="camera" />
              <span><strong>{profileImageSaving ? "Saving Picture..." : displayedProfileImage ? "Change Picture" : "Add Picture"}</strong><small>JPG, PNG, or WebP · maximum 2 MB</small></span>
              <Icon name="arrow" size={17} />
            </button>
            <input ref={photoInputRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfileImage} />
            <DashboardAppearanceControls
              isLightSidebar={appearance.isLightSidebar}
              isLightCardHeaders={appearance.isLightCardHeaders}
              isSidebarCollapsed={appearance.isSidebarCollapsed}
              onToggleSidebar={appearance.toggleSidebarTheme}
              onToggleCardHeaders={appearance.toggleCardHeaderTheme}
              onToggleSidebarCollapsed={appearance.toggleSidebarCollapsed}
            />
            <a href={membershipUrl || "https://lwrpickleballclub.com/manage-membership"} target="_blank" rel="noreferrer">
              <Icon name="external" />
              <span><strong>Club Membership</strong><small>Open the club membership website</small></span>
              <Icon name="arrow" size={17} />
            </a>
            <button type="button" className={styles.logoutAction} onClick={() => setLogoutConfirmOpen(true)}>
              <Icon name="logout" />
              <span><strong>Log Out</strong><small>Log out of this browser or device only</small></span>
              <Icon name="arrow" size={17} />
            </button>
          </div>
          {profileImageError && <p className={styles.inlineError}>{profileImageError}</p>}
          {profileImageMessage && <p className={styles.inlineSuccess}>{profileImageMessage}</p>}
          <footer className={styles.profileMeta}>
            <span>Version {APP_VERSION}</span>
            <span>© {currentYear} Lakewood Ranch Pickleball Club</span>
            <LmsInstallButton iconOnly />
          </footer>
        </section>
      </div>

      {logoutConfirmOpen && (
        <div className={`${styles.modalLayer} ${styles.confirmLayer}`} role="alertdialog" aria-modal="true" aria-labelledby="profile-logout-title">
          <button type="button" className={styles.backdrop} onClick={() => !logoutPending && setLogoutConfirmOpen(false)} aria-label="Cancel logout" />
          <section className={styles.confirmDialog}>
            <span>Account</span>
            <h2 id="profile-logout-title">Log out of this device?</h2>
            <p>You will remain signed in on your other browsers and devices.</p>
            {logoutError && <p className={styles.inlineError}>{logoutError}</p>}
            <div>
              <button type="button" onClick={() => setLogoutConfirmOpen(false)} disabled={logoutPending}>Stay signed in</button>
              <button type="button" className={styles.confirmLogout} onClick={confirmLogout} disabled={logoutPending}>{logoutPending ? "Logging out..." : "Log out"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
