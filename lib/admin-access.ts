"use client";

export async function verifyAdminAccess(
  accessToken: string
): Promise<boolean> {
  const response = await fetch("/api/admin/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return false;

  const result = await response.json();

  return (
    result?.success === true &&
    ["super_admin", "sub_admin"].includes(
      result.admin?.role
    )
  );
}
