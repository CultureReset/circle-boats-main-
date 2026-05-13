// ============================================
// Theme — Beachside Circle Boats colors & fonts
// ============================================

var _themeData = {
  primary: '#00ada8',
  secondary: '#009590',
  bg: '#ffffff',
  text: '#1a1a1a',
  accent: '#f59e0b',
  headingFont: 'Titillium Web',
  bodyFont: 'Inter',
  layout: 'modern'
};

async function loadTheme() {
  var apiData = await CC.dashboard.getTheme();
  if (apiData) {
    if (apiData.theme_color) _themeData.primary = apiData.theme_color;
    if (apiData.theme_font) _themeData.headingFont = apiData.theme_font;
    if (apiData.custom_css) _themeData.customCss = apiData.custom_css;
  }
  document.getElementById('theme-primary').value = _themeData.primary;
  document.getElementById('theme-primary-hex').value = _themeData.primary;
  document.getElementById('theme-secondary').value = _themeData.secondary;
  document.getElementById('theme-secondary-hex').value = _themeData.secondary;
  document.getElementById('theme-bg').value = _themeData.bg;
  document.getElementById('theme-bg-hex').value = _themeData.bg;
  document.getElementById('theme-text').value = _themeData.text;
  document.getElementById('theme-text-hex').value = _themeData.text;
  document.getElementById('theme-accent').value = _themeData.accent;
  document.getElementById('theme-accent-hex').value = _themeData.accent;

  document.getElementById('theme-heading-font').value = _themeData.headingFont;
  document.getElementById('theme-body-font').value = _themeData.bodyFont;
  document.getElementById('theme-layout').value = _themeData.layout;

  // Sync color pickers with hex inputs
  ['primary','secondary','bg','text','accent'].forEach(function(key) {
    var colorInput = document.getElementById('theme-' + key);
    var hexInput = document.getElementById('theme-' + key + '-hex');

    colorInput.addEventListener('input', function() {
      hexInput.value = colorInput.value;
    });

    hexInput.addEventListener('input', function() {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
        colorInput.value = hexInput.value;
      }
    });
  });
}

async function saveTheme() {
  _themeData.primary = document.getElementById('theme-primary').value;
  _themeData.secondary = document.getElementById('theme-secondary').value;
  _themeData.bg = document.getElementById('theme-bg').value;
  _themeData.text = document.getElementById('theme-text').value;
  _themeData.accent = document.getElementById('theme-accent').value;
  _themeData.headingFont = document.getElementById('theme-heading-font').value;
  _themeData.bodyFont = document.getElementById('theme-body-font').value;
  _themeData.layout = document.getElementById('theme-layout').value;

  await CC.dashboard.updateTheme({
    theme_color: _themeData.primary,
    theme_font: _themeData.headingFont,
    custom_css: _themeData.customCss || ''
  });

  toast('Theme saved to database');
}

onPageLoad('theme', loadTheme);
