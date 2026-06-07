// Admin route — noindex so search engines don't index the panel URL
export const metadata = {
  robots: { index: false, follow: false },
  title: "Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
