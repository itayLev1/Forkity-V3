class AuthView {
  _navButton = document.querySelector('.nav__btn--account');
  _overlay = document.querySelector('.auth-overlay');
  _window = document.querySelector('.auth-window');
  _closeButton = document.querySelector('.auth__close');
  _tabs = document.querySelector('.auth__tabs');
  _form = document.querySelector('.auth__form');
  _emailInput = document.querySelector('.auth__email-input');
  _passwordInput = document.querySelector('.auth__password-input');
  _modeInput = document.querySelector('.auth__mode');
  _title = document.querySelector('.auth__title');
  _submitLabel = document.querySelector('.auth__submit-label');
  _errors = document.querySelectorAll('.auth__error');
  _signedIn = document.querySelector('.auth__signed-in');
  _accountEmail = document.querySelector('.auth__account-email');
  _logoutButton = document.querySelector('.auth__logout');
  _navLabel = document.querySelector('.nav__account-label');
  _user = null;

  constructor() {
    this._navButton.addEventListener('click', () => this.open());
    this._closeButton.addEventListener('click', () => this.close());
    this._overlay.addEventListener('click', () => this.close());
    this._tabs.addEventListener('click', this._handleModeClick.bind(this));
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this._window.classList.contains('hidden')) this.close();
    });
  }

  addHandlerSubmit(handler) {
    this._form.addEventListener('submit', async (event) => {
      event.preventDefault();
      this._renderError('');
      this._setBusy(true);

      try {
        await handler({
          email: this._emailInput.value,
          password: this._passwordInput.value,
          mode: this._modeInput.value,
        });
        this._passwordInput.value = '';
      } catch (error) {
        this._renderError(error.message);
      } finally {
        this._setBusy(false);
      }
    });
  }

  addHandlerLogout(handler) {
    this._logoutButton.addEventListener('click', async () => {
      this._renderError('');
      this._setBusy(true);

      try {
        await handler();
      } catch (error) {
        this._renderError(error.message);
      } finally {
        this._setBusy(false);
      }
    });
  }

  render(user) {
    this._user = user;
    this._navLabel.textContent = user?.email || 'Log in';
    this._accountEmail.textContent = user?.email || '';
    this._title.textContent = user
      ? 'Your account'
      : this._modeInput.value === 'register' ? 'Create your account' : 'Log in';
    this._tabs.classList.toggle('hidden', Boolean(user));
    this._form.classList.toggle('hidden', Boolean(user));
    this._signedIn.classList.toggle('hidden', !user);
    this._renderError('');
  }

  open() {
    this._renderError('');
    this._navButton.setAttribute('aria-expanded', 'true');
    this._overlay.classList.remove('hidden');
    this._window.classList.remove('hidden');
    if (!this._user) this._emailInput.focus();
  }

  openLogin() {
    if (!this._user && this._modeInput.value !== 'login') {
      this._modeInput.value = 'login';
      this._title.textContent = 'Log in';
      this._submitLabel.textContent = 'Log in';
      this._passwordInput.autocomplete = 'current-password';
      this._tabs.querySelectorAll('[data-auth-mode]').forEach((tab) => {
        tab.setAttribute('aria-pressed', String(tab.dataset.authMode === 'login'));
      });
    }
    this.open();
  }

  close() {
    this._navButton.setAttribute('aria-expanded', 'false');
    this._overlay.classList.add('hidden');
    this._window.classList.add('hidden');
    this._navButton.focus();
  }

  _handleModeClick(event) {
    const button = event.target.closest('[data-auth-mode]');
    if (!button) return;

    const mode = button.dataset.authMode;
    this._modeInput.value = mode;
    this._title.textContent = mode === 'register' ? 'Create your account' : 'Log in';
    this._submitLabel.textContent = mode === 'register' ? 'Create account' : 'Log in';
    this._passwordInput.autocomplete = mode === 'register' ? 'new-password' : 'current-password';

    this._tabs.querySelectorAll('[data-auth-mode]').forEach((tab) => {
      tab.setAttribute('aria-pressed', String(tab === button));
    });
    this._renderError('');
  }

  _renderError(message) {
    this._errors.forEach((error) => {
      error.textContent = message;
      error.classList.toggle('hidden', !message);
    });
  }

  _setBusy(isBusy) {
    this._form.querySelectorAll('input, button').forEach((element) => {
      element.disabled = isBusy;
    });
    this._logoutButton.disabled = isBusy;
  }
}

export default new AuthView();