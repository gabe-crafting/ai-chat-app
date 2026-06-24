import { AuthErrorPageContent } from "@/components/auth/auth-error-card";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    type?: string;
  }>;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <AuthErrorPageContent searchParams={searchParams} />
    </div>
  );
}
