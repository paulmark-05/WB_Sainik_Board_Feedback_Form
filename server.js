require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config: up to 10 files, each ≤10MB
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

const BRANCH_EMAILS = {
  'Rajya Sainik Board': 'rsb-wb@gov.in',
  'ZSB Burdwan': 'secy.zsb-burdwan@bangla.gov.in',
  'ZSB Coochbehar': 'secyzsb-wb.cbr@coochbehar.gov.in',
  'ZSB Dakshin Dinajpur': 'secy.zsbdd-wb@gov.in',
  'ZSB Darjeeling': 'zsbd-wb@gov.in',
  'ZSB Howrah': 'secy.zsb-howrah@bangla.gov.in',
  'ZSB Jalpaiguri': 'zsb-jalpaiguri@bangla.gov.in',
  'ZSB Kalimpong': 'zsb-kpg@bangla.gov.in',
  'ZSB Kolkata': 'zsb-kolkata@bangla.gov.in',
  'ZSB Malda': 'secy.zsb-malda@bangla.gov.in',
  'ZSB Midnapore': 'secy.zsb-midnapore@bangla.gov.in',
  'ZSB Murshidabad': 'zsb-murshidabad@bangla.gov.in',
  'ZSB Nadia': 'zsb-nadiawb@bangla.gov.in',
  'ZSB North 24 Parganas': 'nayanipaul.24@gmail.com',
  'ZSB South 24 Parganas': 'secy.zsb-wb.s24pgs@nic.in'
};

// Prevent rapid re-submission
const recent = new Map();
function isDuplicate(key) {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < 5000) return true;
  recent.set(key, now);
  return false;
}

// Helper to clean branch names for mapping
function getBranchKey(branchValue) {
  return branchValue.split(' (')[0].trim();
}

// Enhanced email template with logo and professional styling
function generateEmailTemplate(data, forUser = false) {
  const logoURL = 'https://feedback-form-b24b.onrender.com/logo.jpg'; // Update with actual logo URL
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>WB Sainik Board - New Feedback Submission</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <!-- ID: ${uniqueId} -->
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header with Logo -->
        <div style="background: linear-gradient(to bottom, rgb(224, 60, 60), rgb(48, 48, 172), rgb(39, 170, 214)); padding: 20px; text-align: center;">
          <img src="${logoURL}" alt="WB Sainik Board Logo" style="max-height: 100px; margin-bottom: 10px;" />
          <h1 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: bold;">West Bengal Sainik Board</h1>
          <p style="color: #e8f4f8; margin: 5px 0 0 0; font-size: 14px;">
            ${forUser ? 'Thank you for your submission. Your information has been noted for suitable action.' : 'New Submission Received'}
          </p>
        </div>

        <!-- Main Content -->
        <div style="padding: 8px; text-align: center;">
            <h2 style="color: rgb(48, 48, 172); margin: 0 0 8px 0; font-size: 14px;">Submission Details</h2>
          </div>

          <!-- Details Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #dee2e6; border-radius: 5px; overflow: hidden;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px;

