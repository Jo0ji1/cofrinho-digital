/** Traduz mensagens de erro do Supabase Auth para PT-BR */
const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email ou senha incorretos.',
  'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'User already registered': 'Este email já está cadastrado.',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'Password should be at least 8 characters': 'A senha deve ter pelo menos 8 caracteres.',
  'Unable to validate email address: invalid format': 'Formato de email inválido.',
  'Signup requires a valid password': 'Informe uma senha válida.',
  'User not found': 'Usuário não encontrado.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
  'For security purposes, you can only request this once every 60 seconds': 'Por segurança, aguarde 60 segundos antes de tentar novamente.',
  'Request rate limit reached': 'Muitas requisições. Aguarde um momento.',
  'Too many requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
  'Email link is invalid or has expired': 'O link expirou ou é inválido. Solicite um novo.',
  'Token has expired or is invalid': 'Sessão expirada. Faça login novamente.',
  'New password should be different from the old password': 'A nova senha deve ser diferente da anterior.',
  'Auth session missing!': 'Sessão não encontrada. Faça login novamente.',
  'Invalid Refresh Token: Refresh Token Not Found': 'Sessão expirada. Faça login novamente.',
  'duplicate key value violates unique constraint': 'Este registro já existe.',
  'Failed to fetch': 'Sem conexão com o servidor. Verifique sua internet.',
  'Network request failed': 'Falha na conexão. Verifique sua internet.',
  'fetch failed': 'Sem conexão com o servidor. Verifique sua internet.',
};

export function translateError(message: string): string {
  // Busca exata
  if (ERROR_MAP[message]) return ERROR_MAP[message];

  // Busca parcial (caso a mensagem contenha texto conhecido)
  const lowerMsg = message.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (lowerMsg.includes(key.toLowerCase())) return value;
  }

  // Padrões genéricos
  if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many'))
    return 'Muitas tentativas. Aguarde alguns minutos.';
  if (lowerMsg.includes('network') || lowerMsg.includes('fetch'))
    return 'Sem conexão. Verifique sua internet.';
  if (lowerMsg.includes('timeout'))
    return 'A requisição demorou demais. Tente novamente.';
  if (lowerMsg.includes('password'))
    return 'Problema com a senha. Verifique e tente novamente.';
  if (lowerMsg.includes('email'))
    return 'Problema com o email informado.';
  if (lowerMsg.includes('expired') || lowerMsg.includes('token'))
    return 'Sessão expirada. Faça login novamente.';

  // Fallback
  return 'Algo deu errado. Tente novamente.';
}
