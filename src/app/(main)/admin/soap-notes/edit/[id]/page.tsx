"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import the create page to avoid circular dependencies
// and reuse it in edit mode by passing the ID as a prop via URL
export default function EditSOAPNotePage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const id = params?.id;

  // Simply redirect to create page with editId parameter
  // This happens on the client side immediately
  if (typeof window !== "undefined" && id) {
    router.replace(`/admin/soap-notes/create?editId=${id}`);
  }

  return null;
}
