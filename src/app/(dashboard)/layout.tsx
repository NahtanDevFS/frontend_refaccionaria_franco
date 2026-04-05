import Sidebar from "@/components/layout/Sidebar";
import styles from "./DashboardLayout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutWrapper}>
      <Sidebar />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
