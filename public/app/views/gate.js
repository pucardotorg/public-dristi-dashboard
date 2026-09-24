import { html, mount } from '../html.js';

export function renderGate(root, { config, onSubmit }) {
  mount(
    root,
    html`
      <main class="gate">
        <form class="gate__card" id="gate-form" novalidate>
          <h1 class="gate__title">${config.title}</h1>
          <p class="gate__lede">
            Enter the access code shared with your court to see the status of every workstream in your state.
          </p>

          <label class="field">
            <span class="field__label" for="code">Access code</span>
            <input
              class="field__input"
              id="code"
              name="code"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="XX-COURT-2026"
              aria-describedby="gate-error"
              required
            />
          </label>

          <p class="gate__error" id="gate-error" role="alert" hidden></p>

          <button class="button button--primary" type="submit" id="gate-submit">View my court</button>

          <p class="gate__help">
            No code yet? Write to <a href="mailto:${config.contact}">${config.contact}</a>.
          </p>
        </form>
      </main>
    `
  );

  const form = root.querySelector('#gate-form');
  const input = root.querySelector('#code');
  const error = root.querySelector('#gate-error');
  const submit = root.querySelector('#gate-submit');

  const showError = (message) => {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  };

  input.addEventListener('input', () => {
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = input.value.trim();
    if (!code) return showError('Enter the access code for your court.');

    submit.disabled = true;
    submit.textContent = 'Checking';
    try {
      const ok = await onSubmit(code);
      if (!ok) {
        showError('That code was not recognised. Check for typos, or ask your nodal officer.');
        input.select();
      }
    } catch (cause) {
      showError('Something went wrong while checking the code. Try again in a moment.');
      console.error(cause);
    } finally {
      submit.disabled = false;
      submit.textContent = 'View my court';
    }
  });

  input.focus();
}
