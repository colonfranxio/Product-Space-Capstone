import { TopBar } from "../top-bar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px] flex flex-col gap-[18px]">{children}</div>
      </main>
    </>
  );
}
