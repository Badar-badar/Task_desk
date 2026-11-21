import { Resend } from "resend";

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);

type InviteEmailInput = {
  inviterName: string;
  projectName: string;
  role: string;
  link: string;
};
type SendInviteEmailInput = Omit<InviteEmailInput, "link">;

export const inviteEmail = ({ inviterName, projectName, role, link }: InviteEmailInput) => ({
  subject: `${inviterName} invited you to "${projectName}" on Flowboard`,
  text: `${inviterName} invited you to join "${projectName}" as ${role}.\n\nOpen Flowboard: ${link}\n\nSign up using this email address to join the project.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px">
      <p><b>${esc(inviterName)}</b> invited you to join <b>${esc(projectName)}</b> as <b>${esc(role)}</b>.</p>
      <p><a href="${esc(link)}" style="background:#f43f5e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open Flowboard</a></p>
      <p style="color:#666;font-size:13px">Sign up using this email address to join the project. If you weren't expecting this, you can ignore this email.</p>
    </div>`,
});

export const sendInviteEmail = async (to: string, input: SendInviteEmailInput) => {
  const { RESEND_API_KEY, MAIL_FROM, CLIENT_URL } = process.env;
  if (!RESEND_API_KEY || !MAIL_FROM || !CLIENT_URL) {
    throw new Error("Invitation email requires RESEND_API_KEY, MAIL_FROM, and CLIENT_URL");
  }

  const message = inviteEmail({ ...input, link: CLIENT_URL.replace(/\/$/, "") });
  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: MAIL_FROM,
    to,
    ...message,
  });

  if (error) throw new Error(`Failed to send invitation email: ${error.message}`);
};
