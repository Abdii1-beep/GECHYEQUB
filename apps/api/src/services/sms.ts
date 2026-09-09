import axios from 'axios';

interface SmsOptions {
  phoneNumber: string;
  message: string;
}

/**
 * SMS Service for sending OTP messages
 * Currently configured for Africa's Talking (popular in Ethiopia)
 */
class SmsService {
  private username: string;
  private apiKey: string;
  private senderId: string;
  private enabled: boolean;

  constructor() {
    this.username = process.env.SMS_USERNAME || '';
    this.apiKey = process.env.SMS_API_KEY || '';
    this.senderId = process.env.SMS_SENDER_ID || 'EthioLottery';
    this.enabled = !!(this.username && this.apiKey);
  }

  /**
   * Format phone number to Ethiopia format (+251...)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with +251
    if (cleaned.startsWith('0')) {
      cleaned = '251' + cleaned.substring(1);
    }
    
    // If starts with 251, add +
    if (cleaned.startsWith('251')) {
      cleaned = '+' + cleaned;
    }
    
    // If already has +, keep as is
    if (!cleaned.startsWith('+')) {
      cleaned = '+251' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate Ethiopian phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Ethiopian mobile numbers: +251 followed by 9 digits (starting with 9, 7, or 8)
    const ethiopianPhoneRegex = /^\+251[9][0-9]{8}$/;
    return ethiopianPhoneRegex.test(formatted);
  }

  /**
   * Send SMS via Africa's Talking API
   */
  async sendSms(options: SmsOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled) {
      console.log('[SMS] SMS service not configured. Using console log instead.');
      console.log(`[SMS MOCK] To: ${options.phoneNumber}, Message: ${options.message}`);
      return { success: true };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(options.phoneNumber);

      if (!this.validatePhoneNumber(options.phoneNumber)) {
        return { success: false, error: 'Invalid Ethiopian phone number format' };
      }

      // Africa's Talking API endpoint
      const url = 'https://api.africastalking.com/version1/messaging';
      
      const response = await axios.post(
        url,
        new URLSearchParams({
          username: this.username,
          to: formattedPhone,
          message: options.message,
          from: this.senderId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'apiKey': this.apiKey,
          },
        }
      );

      console.log('[SMS] Africa\'s Talking response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.SMSMessageData && response.data.SMSMessageData.Recipients) {
        const recipients = response.data.SMSMessageData.Recipients;
        if (recipients.length > 0 && recipients[0].status === 'Success') {
          console.log(`[SMS] Successfully sent to ${formattedPhone}`);
          return { success: true };
        } else {
          console.error('[SMS] Failed to send:', recipients[0]?.status);
          return { success: false, error: recipients[0]?.status || 'Failed to send SMS' };
        }
      }

      return { success: false, error: 'Unexpected response from SMS provider' };
    } catch (error: any) {
      console.error('[SMS] Error sending SMS:', error.response?.data || error.message);
      console.error('[SMS] Full error:', JSON.stringify(error.response?.data || error, null, 2));
      return { success: false, error: error.message };
    }
  }

  /**
   * Send OTP message
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
    const message = `Your EthioLottery verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    return this.sendSms({ phoneNumber, message });
  }

  /**
   * Check if SMS service is properly configured
   */
  isConfigured(): boolean {
    return this.enabled;
  }
}

export const smsService = new SmsService();
