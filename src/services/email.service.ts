import logger from "@utils/logger";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import * as hbs from "@utils/helper/handlebar.helper";
import nodemailer, { Transporter } from "nodemailer";
import { mailConfig, smtpConfig } from "@config/email";
const { convert } = require("html-to-text");
const { disableAll, enableMonitoring, monitoringRecipients } = mailConfig;
export type EmailNotificationOptions = {
  template: string;
  templateParams: { [name: string]: any };
  subject: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  sendMonitoringEmail?: boolean;
};

export type EmailResult = SMTPTransport.SentMessageInfo | false;

// Setup SMTP transport using configuration
const transporter: Transporter = nodemailer.createTransport(smtpConfig.smtp);

// Define the parameters for the email function
interface EmailParams {
  userEmail: string;
  cc?: string[];
  bcc?: string;
  subject: string;
  htmlData?: string;
  textData?: string;
  sendMonitoringEmail?: boolean;
}
export const EmailService = {
  async sendEmailNotification(
    options: EmailNotificationOptions
  ): Promise<EmailResult> {
    logger.debug(
      "EmailService: sendEmailNotification - Rendering email using handlebar"
    );
    const template = `template/notify/${options.template}.handlebars`;
    let emailHtmlString: any = await hbs.renderHandlebarTemplate(
      template,
      options.templateParams ?? {}
    );
    logger.debug(
      "EmailService: sendEmailNotification - Sending email",
      emailHtmlString
    );
    const plainText = convert(emailHtmlString?.string, { wordwrap: 130 });

    const emailPayload: EmailParams = {
      userEmail: options.to,
      cc: options.cc,
      subject: options.subject,
      htmlData: emailHtmlString?.string,
      textData: plainText,
    };
    return EmailService.sendSMTPMail(emailPayload);
  },

  async sendSMTPMail({
    userEmail,
    cc,
    bcc,
    subject,
    htmlData,
    textData,
    sendMonitoringEmail
  }: EmailParams): Promise<EmailResult> {
    let result: EmailResult = false;
    if (disableAll) {
      logger.warn(`email_service:disabled: ${userEmail}`);
      return result;
    }
    try {
      // Setup main mail options
      const mailOptions = {
        from: smtpConfig.smtp.auth.user,
        to: userEmail,
        cc,
        bcc,
        subject,
        html: htmlData,
        text: textData,
      };

      // Send email
      logger.debug(`Sending SMTP email ${userEmail}`);
      const info = await transporter.sendMail(mailOptions);
      logger.debug(`Email sent for ${userEmail} `, { response: info });

      // Send a monitoring email if monitoring is enabled
      if (smtpConfig.enableMonitoring && monitoringRecipients?.length && sendMonitoringEmail) {
        mailOptions.cc = [];
        await Promise.all(
          monitoringRecipients.map(async (to) => {
            try {
              mailOptions.to = to;
              mailOptions.subject = `Monitoring: Email from ${userEmail} with ${mailOptions.subject}`;
              logger.debug(`Sending monitoring SMTP email to ${to}`, {
                mailOptions,
              });
              const monitoringEmailResult = await transporter.sendMail(
                mailOptions
              );
              logger.debug(`Sent monitoring email to ${to}`, { mailOptions });
              result = monitoringEmailResult;
            } catch (err) {
              logger.error(`Monitoring SMTP email Failed for ${to}`, {
                error: {
                  message: (err as any).message,
                  response: (err as any).response,
                },
              });
            }
          })
        );
      }
      return result;
    } catch (error) {
      console.error("Error sending email:", error);

      // Send error notification to monitoring email if monitoring is enabled
      if (smtpConfig.enableMonitoring) {
        await transporter.sendMail({
          from: smtpConfig.smtp.auth.user,
          to: smtpConfig.monitoringEmail,
          subject: "Error Sending Email",
          text: `Failed to send email to ${userEmail}. Error: ${
            (error as Error).message
          }`,
        });
        logger.debug("Monitoring error email sent");
      }

      throw error;
    }
  },
};
