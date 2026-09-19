// Supabase retains responsibility for password hashing and session verification.
// This reserved, non-deliverable address is only an internal username identifier.
export function teacherIdentity(input: string, signup = false): string {
  const value = input.trim().toLowerCase()
  if (!signup && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value
  if (!/^[a-z0-9_]{3,24}$/.test(value))
    throw new Error('아이디는 영문·숫자·밑줄(_) 3~24자로 입력해 주세요.')
  return `teacher-${value}@accounts.world-journal.invalid`
}
