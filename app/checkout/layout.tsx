// Это отключает попытку статической генерации для всей папки checkout
export const dynamic = "force-dynamic";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}