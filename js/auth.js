// ============================================
// Auth — Signup, Login, Logout, Reset
// Uses Supabase Auth directly via CC client
// ============================================

async function signup(email, password, businessName, businessType) {
  var result = await CC.signup({ email: email, password: password, name: businessName, businessName: businessName, businessType: businessType });
  if (!result) throw new Error('Signup failed — server may be unreachable');
  if (result.error) throw new Error(result.error);
  return result;
}

async function login(email, password) {
  var result = await CC.login(email, password, true);
  if (!result) throw new Error('Login failed — check credentials or try again');
  if (result.error) throw new Error(result.error);
  return result;
}

async function logout() {
  try {
    if (typeof CC !== 'undefined') {
      CC.clearToken();
    }
    if (supabase && supabase.auth) {
      await supabase.auth.signOut();
    }
  } catch (e) {
    console.error('Logout error:', e);
  }
  window.location.href = 'login.html';
}

async function resetPassword(email) {
  if (supabase && supabase.auth) {
    try {
      var { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (e) {
      throw new Error(e.message || 'Password reset failed');
    }
  }
  throw new Error('Auth service unavailable');
}
