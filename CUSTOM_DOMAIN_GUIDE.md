# How to Connect Your Custom Domain

This guide will walk you through the process of connecting a domain you've purchased (e.g., from GoDaddy, Google Domains, etc.) to your CCTV Job Connect application hosted on Firebase.

The process involves two main parts:
1.  Adding the domain to your Firebase project.
2.  Updating the DNS records at your domain registrar.

---

## Part 1: In the Firebase Console

1.  **Open Your Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and select the project that this application is deployed to.

2.  **Navigate to App Hosting:** In the left-hand navigation menu, go to **Build > App Hosting**.

3.  **Manage Backend:** You will see a list of your App Hosting backends. Click the **"Manage"** button for your application.

4.  **Add Custom Domain:** Select the **"Custom domains"** tab and click the **"Add custom domain"** button.

5.  **Enter Domain Name:**
    *   Enter the domain name you own (e.g., `www.yourdomain.com`).
    *   It's recommended to also check the box to **"Redirect [yourdomain.com] to [www.yourdomain.com]"** for consistency.
    *   Click **"Continue"**.

6.  **Verify Ownership:**
    *   Firebase will now provide you with a **TXT record** value to prove you own the domain. It will look something like `google-site-verification=...`.
    *   **Copy this entire value.** You will need it for the next steps.
    *   Keep this Firebase window open.

---

## Part 2: At Your Domain Registrar

Now, you need to go to the website where you bought your domain (e.g., GoDaddy, Namecheap, Google Domains).

1.  **Find DNS Settings:** Log in to your registrar's dashboard and navigate to the DNS management page for your domain.

2.  **Add the Verification Record (TXT):**
    *   Create a **new** DNS record with the following settings:
        *   **Type:** `TXT`
        *   **Host/Name:** `@` (or `yourdomain.com` if `@` is not accepted)
        *   **Value/Data:** Paste the `google-site-verification=...` value you copied from Firebase.
        *   **TTL:** You can leave this at the default setting (usually 1 hour or "Automatic").
    *   Save the TXT record.

3.  **Verify in Firebase:** Go back to the Firebase console window and click the **"Verify"** button. It may take a few minutes (or longer, in some cases) for your DNS changes to be visible to Firebase. If it doesn't work immediately, wait 15-20 minutes and try again.

4.  **Get A Records:** Once verification is successful, Firebase will provide you with **two IP addresses**. These are the `A` records that will point your domain to Firebase's global content delivery network (CDN).

5.  **Add the A Records:** Go back to your domain registrar's DNS settings.
    *   **Important:** If you have any existing `A` or `AAAA` records for your root domain (`@`), you should delete them first.
    *   Add the **first** A record:
        *   **Type:** `A`
        *   **Host/Name:** `@`
        *   **Value:** The first IP address from Firebase.
        *   **TTL:** Default.
    *   Add the **second** A record:
        *   **Type:** `A`
        *   **Host/Name:** `@`
        *   **Value:** The second IP address from Firebase.
        *   **TTL:** Default.

    *   If you also configured a `www` redirect, you will add a similar set of `A` records for the `www` host.

---

## Part 3: Finalization

1.  **Wait for Propagation:** DNS changes can take time to spread across the internet. While it's often fast, it can sometimes take up to 48 hours.

2.  **SSL Certificate:** Once your domain is pointing to Firebase, Firebase will automatically provision and install a free SSL certificate for your site, enabling HTTPS. This process usually takes a few hours.

After these steps are complete, your application will be live and secure on your custom domain!