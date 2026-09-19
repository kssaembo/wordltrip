import { it, expect } from 'vitest'
import { teacherIdentity } from '../src/lib/teacherAuth'
it('아이디 대소문자·공백을 정규화하고 기존 이메일 로그인은 유지한다', () => {
  expect(teacherIdentity(' Teacher_01 ', true)).toBe(
    'teacher-teacher_01@accounts.world-journal.invalid',
  )
  expect(teacherIdentity('Teacher_01')).toBe(teacherIdentity('teacher_01', true))
  expect(teacherIdentity(' Existing@School.kr ')).toBe('existing@school.kr')
})
it('신규 가입은 지정된 아이디만 허용한다', () => {
  for (const name of ['ab', '이름', 'has space', 'name@school.kr', 'a'.repeat(25), 'a+b'])
    expect(() => teacherIdentity(name, true)).toThrow()
})
