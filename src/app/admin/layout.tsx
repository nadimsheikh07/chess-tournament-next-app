import type { ReactNode } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

export const instant = false;

export default function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
