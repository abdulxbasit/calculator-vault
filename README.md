# 🔒 Secret Vault Calculator

A discrete, password-protected Vault disguised as a fully functional Calculator app built with React Native and Expo SDK 54.

## 📱 Download Android APK

[![Download Secret Vault Calculator APK](https://img.shields.io/badge/Download-SecretVaultCalculator.apk-2563EB?style=for-the-badge&logo=android&logoColor=white)](https://github.com/abdulxbasit/calculator-vault/releases/download/v1.5.0/SecretVaultCalculator.apk)

Click the button above or download directly from the [GitHub Releases Page](https://github.com/abdulxbasit/calculator-vault/releases/tag/v1.5.0).

---

## ✨ Features

- **Calculator Disguise**: Fully functional dark-mode calculator interface that unlocks the secret vault when your PIN is entered followed by `=`.
- **Media Vault**: Store encrypted private photos and videos.
- **Documents Vault**: Safely import and organize confidential documents (PDFs, spreadsheets, text files).
- **Google Keep Style Notes**: WYSIWYG rich text notes editor with custom Google Keep dark color themes and formatting toolbar.
- **Clean Password Keeper**: Store account logins and passwords with 1-tap copy actions for email and password.
- **AES-256 Encrypted Backups**: Password-protected export and import (`.vault` bundles) to backup all your data locally or share securely.
- **Task Switcher Privacy Shield**: Native `FLAG_SECURE` integration (`expo-screen-capture`) prevents screenshot previews of your vault contents when switching recent apps.

---

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npx expo start
   ```

3. **Build Standalone Android APK**
   ```bash
   cd android && .\gradlew.bat assembleRelease
   ```
