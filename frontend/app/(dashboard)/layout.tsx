import { Nav } from "@/components/nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Nav />
      <main>{children}</main>
    </div>
  );
}
