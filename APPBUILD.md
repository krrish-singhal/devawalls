# Deva Walls — Android APK Build and Deployment Guide

This guide outlines the step-by-step instructions and terminal commands required to configure the environment, run local verification, and build a release-ready Android APK using Expo Application Services (EAS) to send to your CTO and clients.

---

## 📋 Prerequisites
Before triggering the build, ensure you have the following installed on your machine:
* **Node.js** (v18 or higher recommended)
* **Expo CLI** (`npm install -g expo-cli`)
* **EAS CLI** (`npm install -g eas-cli`)

---

## 🛠️ Step 1: Local Verification
Verify that both the backend and frontend are compile-ready and free of errors.

### 1. Typecheck the Frontend
Navigate to the frontend directory and run:
```bash
npx tsc --noEmit
```
*Ensure this returns exit code `0` with no compilation errors.*

### 2. Typecheck the Backend
Navigate to the backend directory and run:
```bash
cd backend
npx tsc --noEmit
cd ..
```
*Ensure this returns exit code `0` with no compilation errors.*

---

## 🔑 Step 2: Environment Configuration
Make sure the environment configurations are set up for production.

### Backend Configurations (`backend/.env`)
Ensure your Cloudinary and MongoDB properties are correct:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/devawalls
JWT_SECRET=your_super_secret_key_here_make_it_long
API_BASE_URL=http://<YOUR_IP_ADDRESS>:4000
GOOGLE_CLIENT_ID=1075395928158-ph8kpe7pj85p6efblgjndjomvusa2eqv.apps.googleusercontent.com

CLOUDINARY_CLOUD_NAME=deedbf5co
CLOUDINARY_API_KEY=155626369897141
CLOUDINARY_API_SECRET=RBCnPFUWOPSX8GMzV0zFbT5VewQ
```

### Frontend Configurations (`.env`)
Update the public API URL to point to your live backend server (use your local machine's IP address when testing on local Wi-Fi, or your production URL):
```env
EXPO_PUBLIC_API_URL=http://<YOUR_IP_ADDRESS>:4000/api
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=1075395928158-t0l79ddsjt7vfjcitp8i406d0tcjueva.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1075395928158-ph8kpe7pj85p6efblgjndjomvusa2eqv.apps.googleusercontent.com
```

---

## 🚀 Step 3: Triggering the EAS Android APK Build
We configure the EAS build profile to compile an installable Android APK (`.apk` format) instead of an app bundle (`.aab`).

### 1. Authenticate with Expo
If you are not logged in, run:
```bash
eas login
```
*Log in with your Expo credentials.*

### 2. Check App Association
Ensure your project is registered with your Expo account:
```bash
eas project:init
```

### 3. Build the APK
Execute the EAS compiler command using the pre-configured `preview` profile:
```bash
eas build --platform android --profile preview
```

### 4. What happens during this build?
* EAS will check your keystore/credentials. If this is the first build, you can choose **"Generate new keystore"** (let Expo handle all credentials automatically).
* The build is sent to the Expo remote cloud server.
* Once the build completes, the terminal will display a direct **QR Code** and a **downloadable APK link**.
* Download the APK directly from the link or scan the QR code to install it on your Android testing device.

---

## 📁 Step 4: Sending the APK to the Client/CTO
Once you download the compiled `application.apk` file from the Expo dashboard:
1. **Host/Upload the file:** Upload it to Google Drive, Dropbox, or Slack.
2. **Direct QR Link:** You can also share the Expo build URL directly; the client will be able to scan the QR code on that page to download the build instantly.
