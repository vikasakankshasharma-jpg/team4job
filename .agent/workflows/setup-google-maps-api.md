---
description: Guide to enabling Google Cloud Billing and setting up Maps API
---

# Setting up Google Maps API with Billing

To get a functional Google Maps API key for your application, you must enable billing on the Google Cloud Platform (GCP). This allows you to use the $200 monthly free credit.

## Step 1: Link a Billing Account

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project: **studio-1890574003-16f26** (or correct project if different).
3.  Open the **Navigation Menu** (≡) in the top-left corner.
4.  Select **Billing**.
5.  Click **Link a Billing Account**.
6.  If you don't have one, click **Create Billing Account**.
    *   Follow the prompts to enter your business info and payment method (Credit/Debit Card).
    *   *Note: Google asks for this to verify identity. You won't be charged unless you exceed the $200 free monthly credit.*

## Step 2: Enable Required APIs

Once billing is linked, you need to enable the specific Maps services used by your app:

1.  In the Cloud Console, go to **APIs & Services** > **Library**.
2.  Search for and **ENABLE** the following APIs:
    *   **Maps JavaScript API** (for the interactive map)
    *   **Place API** (for searching places/pincodes)
    *   **Geocoding API** (for converting addresses to coordinates)

## Step 3: Create and Restrict API Key

1.  Go to **APIs & Services** > **Credentials**.
2.  Click **+ CREATE CREDENTIALS** > **API key**.
3.  Copy the generated key.
4.  **Important:** Click **Edit API key** to restrict it:
    *   Under **Application restrictions**, select **Websites**.
    *   Add your domains:
        *   `http://localhost:3000/*` (for local development)
        *   `https://your-production-domain.com/*` (for your live site)
    *   Under **API restrictions**, select **Restrict key** and check the 3 APIs you enabled above (Maps JS, Places, Geocoding).
5.  Save your changes.

## Step 4: Update Your Project

1.  Open your `.env.local` file in the project root.
2.  Update or add the variable:
    ```env
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_new_api_key_here
    ```
3.  Restart your development server:
    ```bash
    npm run dev
    ```
