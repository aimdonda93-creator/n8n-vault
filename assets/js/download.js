const STORAGE_KEY_DRIVE = 'n8n_vault_drive';
const STORAGE_KEY_TOKEN = 'n8n_vault_token';
const STORAGE_KEY_PID   = 'n8n_vault_payment_id';

function showSuccess(driveLink, paymentId, isReturning) {
  document.getElementById('dl-loading').style.display = 'none';
  document.getElementById('dl-content').style.display = 'block';
  document.getElementById('drive-link-btn').href = driveLink;

  if (isReturning) {
    document.getElementById('returning-banner').style.display = 'block';
  }
  if (paymentId) {
    document.getElementById('payment-meta').textContent = `Payment ID: ${paymentId}`;
  }
}

function showError(msg) {
  document.getElementById('dl-loading').style.display = 'none';
  document.getElementById('dl-error-content').style.display = 'block';
  if (msg) document.getElementById('dl-error-msg').textContent = msg;
}

function decodeDriveLink(encoded) {
  try {
    const link = atob(encoded);
    if (!link.startsWith('https://')) throw new Error();
    return link;
  } catch {
    return null;
  }
}

function init() {
  const params    = new URLSearchParams(window.location.search);
  const tokenParam = params.get('token');
  const driveParam = params.get('drive');

  // ── Fresh redirect after payment (with or without token) ──
  if (driveParam) {
    const driveLink = decodeDriveLink(driveParam);
    if (driveLink) {
      localStorage.setItem(STORAGE_KEY_DRIVE, driveParam);
      if (tokenParam) localStorage.setItem(STORAGE_KEY_TOKEN, tokenParam);
      const savedPid = localStorage.getItem(STORAGE_KEY_PID) || '';
      showSuccess(driveLink, savedPid, false);
      window.history.replaceState({}, '', '/download.html');
      return;
    }
  }

  // ── Returning visitor — check localStorage ──
  const savedDrive = localStorage.getItem(STORAGE_KEY_DRIVE);
  if (savedDrive) {
    const driveLink = decodeDriveLink(savedDrive);
    if (driveLink) {
      showSuccess(driveLink, localStorage.getItem(STORAGE_KEY_PID) || '', true);
      return;
    }
    // Corrupt entry — clear it
    localStorage.removeItem(STORAGE_KEY_DRIVE);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_PID);
  }

  showError('No valid download found. If you completed a payment, please return to the homepage and contact support with your Razorpay payment ID.');
}

init();
