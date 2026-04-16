type Props = {
  latitude: number;
  longitude: number;
  title: string;
};

export function StoreMapEmbed({ latitude, longitude, title }: Props) {
  const q = `${latitude},${longitude}`;
  return (
    <div className="overflow-hidden rounded-xl border border-blueExtraLight bg-blueUltraLight">
      <iframe
        title={title}
        src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`}
        className="h-[280px] w-full md:h-[320px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
