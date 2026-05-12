const RZP_KEY_ID      = 'rzp_live_SoNX2Ls05bloCP';
const AMOUNT_PAISE    = 39900; // ₹399 (displayed as ₹499 on site)
const DRIVE_LINK_B64  = btoa('https://drive.google.com/file/d/1F4T9ud2QEDhppKNivsJ8DLQ3lX2ngz-I/view?usp=sharing');

/* ── Navbar scroll ── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

/* ── Mobile menu toggle ── */
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('open');
});

/* ── All "Buy Now" buttons open the modal ── */
['buy-btn', 'buy-btn-final', 'nav-buy-btn', 'mobile-buy-btn', 'buy-btn-pricing'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', openModal);
});

/* ── Check for payment-failed redirect on page load ── */
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('pfail') === '1') {
    showFailedToast();
    window.history.replaceState({}, '', window.location.pathname);
  }
});

/* ════════════════════════════════
   MODAL
════════════════════════════════ */
const modal       = document.getElementById('purchase-modal');
const form        = document.getElementById('purchase-form');
const btnPay      = document.getElementById('btn-pay');
const btnContent  = document.getElementById('btn-pay-content');
const btnLoading  = document.getElementById('btn-pay-loading');
const modalStatus = document.getElementById('modal-status');

function openModal() {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('buyer-name').focus();
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
  resetForm();
}

function resetForm() {
  form.reset();
  modalStatus.style.display = 'none';
  setPayBtnLoading(false);
  document.querySelectorAll('.form-group input').forEach(i => i.classList.remove('error'));
}

document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display !== 'none') closeModal(); });

/* ── Retry notification ── */
const retryNotif = document.getElementById('retry-notification');
document.getElementById('retry-btn').addEventListener('click', () => {
  retryNotif.style.display = 'none';
  openModal();
});
document.getElementById('retry-close-btn').addEventListener('click', () => {
  retryNotif.style.display = 'none';
});

/* ── Form submission ── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const name      = document.getElementById('buyer-name').value.trim();
  const email     = document.getElementById('buyer-email').value.trim();
  const phoneCode = document.getElementById('buyer-phone-code').value;
  const phoneNum  = document.getElementById('buyer-phone').value.trim();
  const phone     = phoneNum ? `${phoneCode}${phoneNum.replace(/\s+/g, '')}` : '';

  setPayBtnLoading(true);
  showModalStatus('', '');

  let orderData = null;
  try {
    const res = await fetch('/.netlify/functions/create-order', { method: 'POST' });
    if (res.ok) orderData = await res.json();
  } catch (_) { /* fallback to direct checkout */ }

  setPayBtnLoading(false);
  closeModal();

  const baseOptions = {
    key: RZP_KEY_ID,
    amount: AMOUNT_PAISE,
    currency: 'INR',
    name: 'N8N Vault',
    description: '10,000+ N8N Workflow Templates',
    theme: { color: '#7c3aed' },
    prefill: { name, email, contact: phone },
    modal: { ondismiss: () => {} },
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
      emi: false,
      paylater: false,
    },
  };

  if (orderData && orderData.order_id) {
    openRazorpay({
      ...baseOptions,
      order_id: orderData.order_id,
      handler: async (response) => {
        try {
          const vRes = await fetch('/.netlify/functions/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });
          const result = await vRes.json();
          if (!vRes.ok || !result.success) throw new Error(result.error || 'Verification failed');

          localStorage.setItem('n8n_vault_token',       result.token);
          localStorage.setItem('n8n_vault_drive',       result.driveLink);
          localStorage.setItem('n8n_vault_payment_id',  result.paymentId);
          localStorage.setItem('n8n_vault_buyer_name',  name);
          localStorage.setItem('n8n_vault_buyer_email', email);
          sessionStorage.removeItem('rzp_fail_count');

          window.location.href = `download.html?token=${encodeURIComponent(result.token)}&drive=${encodeURIComponent(result.driveLink)}`;
        } catch (err) {
          handlePaymentFailure(response.razorpay_payment_id);
        }
      },
    });
  } else {
    openRazorpay({
      ...baseOptions,
      handler: (response) => {
        localStorage.setItem('n8n_vault_payment_id', response.razorpay_payment_id);
        localStorage.setItem('n8n_vault_drive',      DRIVE_LINK_B64);
        localStorage.setItem('n8n_vault_buyer_name', name);
        localStorage.setItem('n8n_vault_buyer_email', email);
        sessionStorage.removeItem('rzp_fail_count');
        window.location.href = `download.html?drive=${encodeURIComponent(DRIVE_LINK_B64)}`;
      },
    });
  }
});

/* ════════════════════════════════
   PAYMENT FAILURE LOGIC
════════════════════════════════ */
function handlePaymentFailure(paymentId) {
  let count = parseInt(sessionStorage.getItem('rzp_fail_count') || '0') + 1;
  sessionStorage.setItem('rzp_fail_count', count);

  if (count >= 2) {
    // 2nd failure → redirect to index with error toast
    sessionStorage.removeItem('rzp_fail_count');
    window.location.href = 'index.html?pfail=1';
  } else {
    // 1st failure → show retry notification
    const pidEl = document.getElementById('retry-payment-id');
    if (pidEl && paymentId) {
      pidEl.textContent = `Payment ID: ${paymentId}`;
      pidEl.style.display = 'block';
    }
    retryNotif.style.display = 'flex';
    retryNotif.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* Payment-failed toast (shown on page load after 2nd failure redirect) */
function showFailedToast() {
  const toast = document.getElementById('payment-failed-toast');
  if (!toast) return;
  toast.style.display = 'flex';
  // Auto-dismiss after 8 seconds
  setTimeout(() => dismissToast(), 8000);
}

window.dismissToast = function () {
  const toast = document.getElementById('payment-failed-toast');
  if (toast) toast.style.display = 'none';
};

/* ════════════════════════════════
   HELPERS
════════════════════════════════ */
function validateForm() {
  let valid = true;
  const nameEl  = document.getElementById('buyer-name');
  const emailEl = document.getElementById('buyer-email');
  nameEl.classList.remove('error');
  emailEl.classList.remove('error');
  if (!nameEl.value.trim()) { nameEl.classList.add('error'); nameEl.focus(); valid = false; }
  const emailVal = emailEl.value.trim();
  if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    emailEl.classList.add('error');
    if (valid) emailEl.focus();
    valid = false;
  }
  if (!valid) showModalStatus('Please fill in your name and a valid email.', 'error');
  return valid;
}

function setPayBtnLoading(on) {
  btnPay.disabled = on;
  btnContent.style.display = on ? 'none'         : 'inline-flex';
  btnLoading.style.display  = on ? 'inline-block' : 'none';
}

function showModalStatus(msg, type) {
  modalStatus.textContent = msg;
  modalStatus.className   = `payment-status ${type}`;
  modalStatus.style.display = msg ? 'block' : 'none';
}

function openRazorpay(options) {
  function launch() {
    try { new Razorpay(options).open(); }
    catch (e) { handlePaymentFailure(''); }
  }
  if (typeof Razorpay === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = launch;
    s.onerror = () => handlePaymentFailure('');
    document.head.appendChild(s);
  } else {
    launch();
  }
}
