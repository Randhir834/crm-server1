const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Test email function
const testEmail = async () => {
  try {
    console.log('📧 Testing email configuration...');
    console.log('Email User:', process.env.EMAIL_USER ? 'Configured' : 'Not configured');
    console.log('Email Pass:', process.env.EMAIL_PASS ? 'Configured' : 'Not configured');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in your .env file');
      console.log('\n💡 To configure email:');
      console.log('1. Create a .env file in the server directory');
      console.log('2. Add your Gmail credentials:');
      console.log('   EMAIL_USER=your-email@gmail.com');
      console.log('   EMAIL_PASS=your-app-password');
      console.log('3. Make sure to use an App Password if 2FA is enabled');
      return;
    }

    // Test email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Password Reset Test - CRM App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Reset Test</h2>
          <p>Hello,</p>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p>If you received this email, your password reset functionality should work properly.</p>
          <p>Best regards,<br>Your CRM Team</p>
        </div>
      `
    };

    // Send test email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n💡 Common issues:');
    console.log('1. Check your Gmail credentials');
    console.log('2. Make sure you\'re using an App Password if 2FA is enabled');
    console.log('3. Verify that "Less secure app access" is enabled (if not using App Password)');
    console.log('4. Check your .env file configuration');
  }
};

// Run the test
testEmail(); 