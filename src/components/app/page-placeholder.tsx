type PagePlaceholderProps = {
  title: string;
  description: string;
  detail?: string;
};

export default function PagePlaceholder({
  title,
  description,
  detail,
}: PagePlaceholderProps) {
  return (
    <div className="w-full p-6 md:p-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-6 flex min-h-48 items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {detail ??
          "This screen is a placeholder and arrives in a later ticket."}
      </div>
    </div>
  );
}
