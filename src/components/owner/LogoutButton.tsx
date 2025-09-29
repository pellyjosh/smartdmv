"use client";

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/owner/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Clear any client-side storage if needed
        localStorage.removeItem("owner_token");
        // Redirect to login page
        window.location.href = "/owner/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      Sign Out
    </button>
  );
}
