/** Offline, fail-closed utterance policy for synthetic UIA fixture testing.
 * Not wired into the Windows C# reader; security research boundary only.
 */
const BLOCKED_ROLES = new Set(['edit', 'password', 'textbox', 'searchbox', 'combobox']);
const SENSITIVE_HINT = /(?:parola|şifre|sifre|password|passcode|pin\s*(?:kod|code)|cvv|cvc|otp|tek\s*kullanımlık|one[- ]time\s*password|güvenlik\s*kodu|guvenlik\s*kodu|secret|token|api[_ -]?key|access[_ -]?key)/iu;
const CONTROL = /[\u0000-\u001f\u007f]/gu;
const MAX_CHARS = 850;

export function evaluateUtterance(element, approvedProcessIds = []) {
  if (!element || typeof element !== 'object' || !Array.isArray(approvedProcessIds)) return {allowed:false, reason:'invalid-input'};
  const {processId, role, name, isPassword, isOffscreen, isEnabled} = element;
  if (!Number.isSafeInteger(processId) || !approvedProcessIds.includes(processId)) return {allowed:false, reason:'process-not-approved'};
  if (isPassword !== false || isOffscreen !== false || isEnabled !== true) return {allowed:false, reason:'unsafe-state'};
  if (typeof role !== 'string' || BLOCKED_ROLES.has(role.trim().toLowerCase())) return {allowed:false, reason:'input-control'};
  if (typeof name !== 'string' || !name.trim()) return {allowed:false, reason:'empty-name'};
  if (SENSITIVE_HINT.test(name)) return {allowed:false, reason:'sensitive-label'};
  const safeName = name.replace(CONTROL, ' ').trim();
  if (!safeName || safeName.length > MAX_CHARS) return {allowed:false, reason:'invalid-length'};
  return {allowed:true, text:`${role.trim()}: ${safeName}`};
}
