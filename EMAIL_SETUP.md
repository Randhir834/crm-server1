# Email Setup for Password Reset Functionality

## Overview
Your CRM application includes a complete password reset system that sends emails to users when they forget their password. This guide will help you configure the email functionality.

## Required Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/CRM?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (Required for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Client URL (for password reset links)
CLIENT_URL=http://localhost:3000

# Server Configuration
PORT=5001
```

## Gmail Setup Instructions

### Option 1: Using App Password (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "CRM App" and generate the password
   - Use this 16-character password as your `EMAIL_PASS`

### Option 2: Using Regular Password (Less Secure)

1. **Enable "Less secure app access"**:
   - Go to your Google Account settings
   - Navigate to Security → Less secure app access
   - Turn it ON
   - Use your regular Gmail password as `EMAIL_PASS`

## Testing Email Configuration

Run the test script to verify your email setup:

```bash
cd server
node test-email.js
```

This will:
- Check if your email credentials are configured
- Send a test email to verify the setup
- Provide troubleshooting tips if there are issues

## How Password Reset Works

1. **User requests password reset**:
   - User enters email on `/forgot-password` page
   - System generates a secure reset token
   - Email is sent with reset link

2. **User clicks reset link**:
   - Link contains the reset token as query parameter
   - User is redirected to `/reset-password` page
   - Token is validated and user can set new password

3. **Password is updated**:
   - New password is hashed and saved
   - Reset token is cleared
   - User can login with new password

## Security Features

- **Token Expiration**: Reset tokens expire after 1 hour
- **Secure Tokens**: Uses crypto.randomBytes for token generation
- **Hashed Storage**: Tokens are hashed before storing in database
- **One-time Use**: Tokens are cleared after password reset

## Troubleshooting

### Email Not Sending
- Check your Gmail credentials
- Verify App Password is correct (if using 2FA)
- Ensure "Less secure app access" is enabled (if not using App Password)
- Check your `.env` file configuration

### Reset Link Not Working
- Verify `CLIENT_URL` is set correctly
- Check that the token hasn't expired (1 hour limit)
- Ensure the frontend is running on the correct port

### Database Issues
- Verify MongoDB connection string
- Check that the User model has reset token fields
- Ensure database is accessible

## Files Involved

### Backend
- `server/routes/authRoutes.js` - Password reset endpoints
- `server/models/User.js` - User model with reset token fields
- `server/test-email.js` - Email testing script

### Frontend
- `client/src/components/ForgotPassword.js` - Forgot password form
- `client/src/components/ResetPassword.js` - Reset password form
- `client/src/App.js` - Routing configuration 