(function () {
  var PASSWORDS = ['akqa', 'doctolib', 'deathtozalando', 'google', 'anthropic', 'figma', 'intercom', 'lovable', 'bendingspoons', 'kraken', 'fin', 'n8n', 'perplexity', 'shopify', 'stripe', 'linear'];
  var KEY = 'portfolio-auth';

  if (sessionStorage.getItem(KEY) === '1') return;

  var overlay = document.createElement('div');
  overlay.id = 'pw-overlay';
  overlay.innerHTML =
    '<div id="pw-box">' +
      '<p id="pw-label">Enter password</p>' +
      '<input id="pw-input" type="password" autocomplete="off" spellcheck="false" autofocus>' +
      '<p id="pw-error" aria-live="polite"></p>' +
      '<a id="pw-contact" href="mailto:uack.uack@gmail.com">no password? get in touch</a>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = document.getElementById('pw-input');
  var error = document.getElementById('pw-error');

  function attempt() {
    var val = input.value.trim().toLowerCase();
    if (PASSWORDS.indexOf(val) !== -1) {
      sessionStorage.setItem(KEY, '1');
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(function () { overlay.remove(); }, 300);
    } else {
      error.textContent = 'incorrect';
      input.value = '';
      input.focus();
      setTimeout(function () { error.textContent = ''; }, 1500);
    }
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') attempt();
  });

  document.getElementById('pw-box').addEventListener('click', function () {
    input.focus();
  });
})();
