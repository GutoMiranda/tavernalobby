import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Moldura das páginas públicas de privacidade e termos. */
export function DocumentoLegal({
  titulo,
  atualizado,
  children,
}: {
  titulo: string;
  atualizado: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl font-bold text-wood">{titulo}</h1>
        </CardTitle>
        <CardDescription>Taverna O Lobby · atualizado em {atualizado}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm leading-relaxed [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-wood [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </CardContent>
    </Card>
  );
}

export function contatoDoAdmin(): string | null {
  const e = process.env.ADMIN_EMAIL?.trim();
  return e && /^[^@\s]+@[^@\s]+$/.test(e) ? e : null;
}
