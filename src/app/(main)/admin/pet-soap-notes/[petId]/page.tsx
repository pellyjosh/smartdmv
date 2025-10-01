// // Server redirect page to canonical SOAP notes route.
// // Keeps backward compatibility for existing links to /admin/pet-soap-notes/[petId]
// import { redirect } from "next/navigation";

// interface PageProps {
//   params: { petId: string };
// }

// export default function PetSoapNotesRedirectPage({ params }: PageProps) {
//   const { petId } = params;
//   // Defensive: ensure petId exists before redirecting
//   if (!petId) {
//     redirect("/admin/soap-notes");
//   }
//   redirect(`/admin/soap-notes/pet/${petId}`);
// }

// export const metadata = {
//   robots: { index: false },
// };
