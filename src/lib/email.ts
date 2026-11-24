import "server-only";

import nodemailer from "nodemailer";

/** E-mail de avisos pelo Gmail (setup §5). Sem as variáveis, não envia e retorna false. */
export async function enviarEmail(para: string[], assunto: string, texto: string): Promise<boolean> {
  const usuario = process.env.SMTP_USER;
  const senha = process.env.SMTP_APP_PASSWORD;
  if (!usuario || !senha || para.length === 0) return false;
  try {
    const transporte = nodemailer.createTransport({ service: "gmail", auth: { user: usuario, pass: senha } });
    // Destinatários em cópia oculta: ninguém vê o e-mail dos outros.
    await transporte.sendMail({
      from: `Taverna O Lobby <${usuario}>`,
      to: usuario,
      bcc: para,
      subject: assunto,
      text: texto,
    });
    return true;
  } catch (e) {
    console.error(`[email] falhou: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
