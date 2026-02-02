# Gate Entry & Exit System

An intelligent, real-time access management solution designed for modern campus security. This system streamlines student entry and exit through QR code scanning, providing live analytics and robust database management.

![Project Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🚀 Features

- **Live Dashboard**: Real-time visualization of entries and exits.
- **QR Code Scanning**: High-speed QR scanning using `html5-qrcode`.
- **Student Management**: Comprehensive database for student records.
- **Activity Logs**: Detailed history of all gate movement with filtering.
- **Real-time Synchronization**: Powered by Supabase for instant data updates.
- **Responsive Design**: Premium UI/UX built with Tailwind CSS and Lucide icons.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend & Database**: Supabase
- **Icons**: Lucide React
- **QR Scanner**: HTML5-QRcode

## 📦 Installation & Setup

### Prerequisites
- **Node.js**: Version 20.19+ or 22.12+ (Required)
- **NPM**: Latest stable version

### Step-by-Step Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/SiddhantKoli/gate-entry-exit-system.git
   cd gate-entry-exit-system
   ```

2. **Setup Frontend**
   ```bash
   cd web-app
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the `web-app` directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

The project is configured for deployment on **Render** using the included `render.yaml`. 

- **Runtime**: Static
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 20

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
