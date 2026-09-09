import nodemailer, { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}

interface ReceiptData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  campaignName: string;
  tickets: Array<{
    purchaseId: string;
    vehicleName: string;
    price: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  purchaseDate: Date;
}

/**
 * Email Service for sending OTP messages and receipts
 */
class EmailService {
  private transporter: Transporter | null = null;
  private enabled: boolean;
  private from: string;

  constructor() {
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT;
    const user = process.env.EMAIL_USER;
    const password = process.env.EMAIL_PASSWORD;
    this.from = process.env.EMAIL_FROM || 'EthioLottery <noreply@ethiolottery.com>';

    this.enabled = !!(host && port && user && password);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: host!,
        port: parseInt(port!),
        secure: port === '465', // true for 465, false for other ports
        auth: {
          user: user!,
          pass: password!,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates (for development)
        },
      });
    }
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled || !this.transporter) {
      console.log('[EMAIL] Email service not configured. Using console log instead.');
      console.log(`[EMAIL MOCK] To: ${options.to}, Subject: ${options.subject}`);
      console.log(`[EMAIL MOCK] HTML: ${options.html}`);
      return { success: true };
    }

    try {
      if (!this.validateEmail(options.to)) {
        return { success: false, error: 'Invalid email address format' };
      }

      const info = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log('[EMAIL] Email sent:', info.messageId);
      return { success: true };
    } catch (error: any) {
      console.error('[EMAIL] Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send OTP email
   */
  async sendOtp(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
    const subject = 'Your EthioLottery Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EthioLottery</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for using EthioLottery. Please use the following verification code to complete your purchase:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #667eea;">
            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            This code will expire in 10 minutes. Do not share this code with anyone.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you did not request this code, please ignore this email.
          </p>
        </div>
      </div>
    `;
    const text = `Your EthioLottery verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Generate receipt HTML
   */
  private generateReceiptHtml(data: ReceiptData): string {
    const ticketRows = data.tickets.map(ticket => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; color: #666;">${ticket.purchaseId}</td>
        <td style="padding: 12px; color: #333;">${ticket.vehicleName}</td>
        <td style="padding: 12px; color: #333; text-align: right;">${ticket.price} ETB</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EthioLottery</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Payment Receipt</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Order Details</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Date:</strong> ${data.purchaseDate.toLocaleString()}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Customer Information</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Name:</strong> ${data.customerName}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Email:</strong> ${data.customerEmail}</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Campaign: ${data.campaignName}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: left;">Ticket Number</th>
                  <th style="padding: 12px; text-align: left;">Vehicle</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
              <tfoot>
                <tr style="background: #f0f0f0; font-weight: bold;">
                  <td colspan="2" style="padding: 12px; text-align: right;">Total:</td>
                  <td style="padding: 12px; text-align: right; color: #667eea; font-size: 18px;">${data.totalAmount} ETB</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Thank you for your purchase! Your tickets are now eligible for the draw.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Send payment receipt
   */
  async sendReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
    const subject = `Payment Receipt - Order ${data.orderId}`;
    const html = this.generateReceiptHtml(data);
    const text = `Payment Receipt - Order ${data.orderId}\n\nCustomer: ${data.customerName}\nEmail: ${data.customerEmail}\nCampaign: ${data.campaignName}\nTickets: ${data.tickets.length}\nTotal: ${data.totalAmount} ETB\nPayment Method: ${data.paymentMethod}`;

    return this.sendEmail({ to: data.customerEmail, subject, html, text });
  }

  /**
   * Send receipt to admin
   */
  async sendReceiptToAdmin(data: ReceiptData, adminEmail: string): Promise<{ success: boolean; error?: string }> {
    const subject = `New Purchase - Order ${data.orderId}`;
    const html = this.generateReceiptHtml(data);
    const text = `New Purchase Notification\n\nOrder ID: ${data.orderId}\nCustomer: ${data.customerName}\nEmail: ${data.customerEmail}\nCampaign: ${data.campaignName}\nTickets: ${data.tickets.length}\nTotal: ${data.totalAmount} ETB`;

    return this.sendEmail({ to: adminEmail, subject, html, text });
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    return this.enabled;
  }
}

export const emailService = new EmailService();
