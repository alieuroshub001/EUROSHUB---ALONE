# Email Service Setup Options

## Current Issue

Resend API is in **test mode** and can only send emails to your verified email: `alirayyan.euroshub@gmail.com`

To send to other users, you need to choose one of these options:

---

## Option 1: Verify Domain with Resend (Recommended for Production) ✅

### Steps:

1. **Go to:** https://resend.com/domains
2. **Click:** "Add Domain"
3. **Enter your domain** (e.g., `euroshub.com`)
4. **Add DNS Records:** Resend provides these records:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT - optional)
5. **Wait for verification** (can take a few minutes to 24 hours)
6. **Update .env:**
   ```env
   RESEND_FROM_EMAIL=noreply@euroshub.com
   ```

### Pros:
- ✅ Professional email addresses
- ✅ High deliverability
- ✅ 3,000 emails/month free
- ✅ Great for production

### Cons:
- ❌ Requires owning a domain
- ❌ DNS setup needed
- ❌ Takes time to verify

---

## Option 2: Use Gmail SMTP (Quick Fix) 📧

### Steps:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Name it "EUROSHUB"
   - Copy the 16-character password

3. **Update .env:**
   ```env
   # Comment out or remove Resend
   # RESEND_API_KEY=re_fUanjfTB_BV7Sis7Dg1pJiCGo1pxCjJsp
   # RESEND_FROM_EMAIL=onboarding@resend.dev

   # Add Gmail SMTP
   EMAIL_SERVICE=gmail
   EMAIL_USERNAME=alirayyan.euroshub@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM=alirayyan.euroshub@gmail.com
   ```

4. **Update emailService.js** to use nodemailer (I can do this for you)

### Pros:
- ✅ Works immediately
- ✅ No domain needed
- ✅ Free (500 emails/day limit)
- ✅ Good for testing

### Cons:
- ❌ Gmail sender address (less professional)
- ❌ 500 emails/day limit
- ❌ May go to spam folder

---

## Option 3: Keep Resend for Testing 🧪

Continue using Resend but only send to yourself for now.

### Update Code:
Send all test emails to `alirayyan.euroshub@gmail.com` regardless of actual recipient.

### Pros:
- ✅ Works now
- ✅ No setup needed

### Cons:
- ❌ Only you get emails
- ❌ Not usable for real users
- ❌ Only for testing

---

## My Recommendation

**For Now (Testing):** Option 2 - Gmail SMTP
**For Production:** Option 1 - Verify domain with Resend

---

## Which Do You Want?

Let me know and I'll help you set it up! 🚀
