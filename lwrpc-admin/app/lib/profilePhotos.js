const PROFILE_PHOTO_BUCKET = "profile-photos";
const PROFILE_PHOTO_URL_MARKER = `/storage/v1/object/public/${PROFILE_PHOTO_BUCKET}/`;
const PROFILE_PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function managedProfilePhotoPath(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const markerIndex = parsed.pathname.indexOf(PROFILE_PHOTO_URL_MARKER);
    if (markerIndex < 0) return "";
    return decodeURIComponent(parsed.pathname.slice(markerIndex + PROFILE_PHOTO_URL_MARKER.length));
  } catch {
    return "";
  }
}

export async function saveProfilePhoto({ client, member, file }) {
  const extension = PROFILE_PHOTO_EXTENSIONS[file?.type];
  if (!extension) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (!member?.id) throw new Error("Your member profile could not be identified.");
  if (file.size > 2_000_000) throw new Error("Choose an image smaller than 2 MB.");

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user?.id) {
    throw userError || new Error("Your signed-in account could not be identified.");
  }

  const objectPath = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const existingUrls = Array.isArray(member.profile_image_urls)
    ? member.profile_image_urls.filter(Boolean)
    : [];
  const previousManagedPaths = existingUrls.map(managedProfilePhotoPath).filter(Boolean);

  const { error: uploadError } = await client.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = client.storage
    .from(PROFILE_PHOTO_BUCKET)
    .getPublicUrl(objectPath);
  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    await client.storage.from(PROFILE_PHOTO_BUCKET).remove([objectPath]);
    throw new Error("The profile picture URL could not be created.");
  }

  const nextProfileImageUrls = [
    publicUrl,
    ...existingUrls.filter((url) => !managedProfilePhotoPath(url)),
  ];
  const { data: updatedMember, error: memberUpdateError } = await client
    .from("members")
    .update({ profile_image_urls: nextProfileImageUrls })
    .eq("id", member.id)
    .select("profile_image_urls")
    .single();

  if (memberUpdateError) {
    await client.storage.from(PROFILE_PHOTO_BUCKET).remove([objectPath]);
    throw memberUpdateError;
  }

  if (previousManagedPaths.length > 0) {
    await client.storage.from(PROFILE_PHOTO_BUCKET).remove(previousManagedPaths);
  }

  return { publicUrl, profileImageUrls: updatedMember.profile_image_urls };
}
