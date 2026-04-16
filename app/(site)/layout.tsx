import { Footer } from "@/components/footer";
import { ChooseLocationProvider } from "@/components/choose-location-provider";
import { SiteFooterSlot } from "@/components/site-footer-slot";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <ChooseLocationProvider>
        <div className="flex min-h-0 flex-1 flex-col bg-white">{children}</div>
      </ChooseLocationProvider>
      <SiteFooterSlot footer={<Footer />} />
    </div>
  );
}
