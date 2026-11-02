// Presentation-only controls; never reads or sends authentication data.
const control = document.getElementById('toggle-password');
const field = document.getElementById('login-password');
if (control && field) {
  control.addEventListener('click', () => {
    const reveal = field.type === 'password';
    field.type = reveal ? 'text' : 'password';
    control.textContent = reveal ? 'Gizle' : 'Göster';
    control.setAttribute('aria-pressed', String(reveal));
    control.setAttribute('aria-label', reveal ? 'Parolayı gizle' : 'Parolayı göster');
    field.focus();
  });
}
