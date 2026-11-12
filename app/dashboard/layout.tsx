import { TopBar } from "../top-bar";
import { SignOut } from "./sign-out";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar><SignOut /></TopBar>
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );
}
