import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card no estilo "quest": moldura de metal ornamentada e miolo de pedra (ver globals.css).
 * moldura: "ouro" (padrão), "verde" (destaque/sucesso) ou "prata" (encerrado/secundário).
 */
function Card({
  className,
  moldura,
  tom,
  ...props
}: React.ComponentProps<"div"> & { moldura?: "ouro" | "verde" | "prata"; tom?: "escuro" }) {
  return (
    <div
      data-slot="card"
      data-moldura={moldura && moldura !== "ouro" ? moldura : undefined}
      data-tom={tom}
      className={cn("text-card-foreground flex min-w-0 flex-col gap-5 py-6", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("grid gap-2 px-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-display text-xl leading-tight font-semibold text-wood [&_svg]:size-7", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center px-6", className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
