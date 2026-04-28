import { LogoutButton } from "@/components/logout-button";

export default function HomePage() {
  return (
    <main className="font-sans min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-lg font-medium tracking-tight">
            Hackathon Portal
          </h1>
          <p className="text-sm text-white/40">Dashboard</p>
        </div>

        <LogoutButton />
      </header>

      <section className="px-6 py-10">
        {/* Empty dashboard */}
      </section>
    </main>
  );
}