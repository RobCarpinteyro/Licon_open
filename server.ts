import express from 'express';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Email Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'd_expert_tour@polarmultimedia.com',
    pass: process.env.SMTP_PASS,
  },
});

// API Routes
app.get('/api/config', (req, res) => {
  res.json({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
});

app.post('/api/send-ticket', async (req, res) => {
  const { email, name, id, date, time, location, address } = req.body;

  if (!email || !name || !id) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Generate QR Code
    const qrData = JSON.stringify({ id });
    const qrImage = await QRCode.toDataURL(qrData);

    // Email Template
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 10px;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: #ffffff; margin: 0;">Inauguración CETRI - LICON</h2>
          <p style="color: #94a3b8; margin: 5px 0 0;">Centro de Tecnología Robótica e Inteligencia Digital</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; text-align: center; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <p style="color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-bottom: 5px;">Asistente</p>
          <h3 style="color: #1e293b; font-size: 24px; margin: 0 0 10px;">${name}</h3>
          
          <div style="display: inline-block; background-color: #f1f5f9; padding: 5px 15px; border-radius: 20px; margin-bottom: 20px;">
            <span style="color: #b45309; font-family: monospace; font-weight: bold;">ID: ${id}</span>
          </div>

          <div style="margin: 20px 0;">
            <img src="${qrImage}" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>

          <div style="text-align: left; background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 5px 0; color: #475569;"><strong>Fecha:</strong> ${date || '26 de febrero'}</p>
            <p style="margin: 5px 0; color: #475569;"><strong>Hora:</strong> ${time || '19:30 hrs'}</p>
            <p style="margin: 5px 0; color: #475569;"><strong>Lugar:</strong> ${location || 'Hotel Camino Real Polanco'}</p>
            <p style="margin: 5px 0; color: #475569; font-size: 12px;">${address || 'Calz. Gral. Mariano Escobedo 700, Anzures, CDMX'}</p>
          </div>

          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Presente este código QR al llegar al evento.</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          &copy; 2026 Inauguración CETRI - LICON.
        </div>
      </div>
    `;

    // Send Email
    await transporter.sendMail({
      from: `"Inauguración CETRI - LICON" <${process.env.SMTP_USER || 'cetri_licon@polarmultimedia.com'}>`,
      to: email,
      subject: 'Su Boleto de Acceso - Inauguración CETRI - LICON',
      html: htmlContent,
    });

    console.log(`Email sent to ${email}`);
    res.json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
