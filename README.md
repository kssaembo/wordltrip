# 지구 한 바퀴

초등 사회과 세계지도 학습용 세계여행 포트폴리오 서비스입니다. 학생이 직접 국가를 고르고 조사·계획·비용·사진·일기를 작성합니다.

## 이번 업데이트 적용

기존 설치는 SQL Editor에서 `supabase/migrations/202609150002_roundtrip.sql`만 한 번 실행하고 프런트엔드를 업데이트합니다. 기존 학급 코드와 기록은 유지됩니다. 새 설치는 001 → 002 순서로 실행합니다.

- 새 학급: 4자리 숫자 코드. 기존 8자리 코드도 사용 가능합니다.
- 대한민국 출발은 고정입니다. 마지막에 **대한민국 도착 추가**를 눌러야 제출할 수 있습니다.
- 출발·도착에서는 날짜/시간과 공통 준비물만 작성합니다. 해외 여행지에서는 준비물을 읽기만 합니다.
- 기존 여행지별 준비물은 공통 목록으로 모으며, 기존 제출 포트폴리오 경로는 유지합니다.
- 학생 화면 제목은 **닉네임의 세계여행**입니다.

## 빠른 실행

Node.js 22.12 이상(개발·검증 환경: Node.js 24)을 사용합니다.

```bash
npm ci
cp .env.example .env.local
# .env.local에 Supabase 프로젝트 URL과 공개 publishable 키 입력
npm run dev
```

Windows PowerShell에서는 `Copy-Item .env.example .env.local`을 사용할 수 있습니다. 현재 작업 폴더의 `.env.local`에는 제공된 연결 정보를 이미 설정했습니다. `.env.local`은 Git에 포함되지 않습니다.

- 개발: `npm run dev`
- 제품 빌드: `npm run build`
- 빌드 결과 보기: `npm run preview`
- 보안·지도·비용 테스트: `npm test`
- 코드 검사: `npm run lint`

## Supabase 설정

1. SQL Editor에서 `supabase/migrations/202609150001_initial.sql`을 실행한 뒤 `supabase/migrations/202609150002_roundtrip.sql`을 실행합니다. 각 파일은 한 번만 실행합니다.
2. Authentication → Sign In / Providers → **Anonymous Sign-Ins**를 활성화하고 저장합니다. 학생은 `signInAnonymously()`로 본인 인증을 받습니다.
3. 교사는 첫 화면의 **교사 로그인 → 교사 계정 만들기**를 사용합니다. 이메일 확인이 켜져 있으면 인증 메일 확인 후 로그인합니다.
4. 배포 후 Authentication → URL Configuration에서 Site URL을 Vercel 주소로 설정하고 필요한 Redirect URL을 등록합니다.

환경 변수:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

브라우저에는 공개 키만 사용합니다. `service_role`/secret 키를 프런트엔드 환경 변수에 넣지 않습니다.

## 사용 순서

### 교사

1. 교사 계정으로 로그인합니다.
2. 프로젝트 제목을 입력해 프로젝트를 만듭니다.
3. 생성된 4자리 숫자 학급 코드를 학생들에게 알려 줍니다.
4. 학생 목록에서 작성 중/제출 완료 상태를 확인합니다. 새로고침 버튼으로 최신 상태를 가져옵니다.
5. 제출된 학생의 포트폴리오를 열람합니다. 작성 중인 상세 기록은 열람하지 않습니다.

### 학생

1. 학급 코드와 닉네임으로 참가합니다. 실명이나 학생 이메일은 수집하지 않습니다.
2. 지도에서 국가를 누르거나 이름을 검색합니다. 작은 나라는 검색을 이용할 수 있습니다.
3. 여행 경로 카드에서 순서를 바꾸고 여행지를 선택합니다.
4. 해외 여행지의 계획·사진·비용·일기와 대한민국의 공통 준비물을 작성하고 **저장**을 누릅니다. 입력 중 변경 표시와 페이지 이탈 경고가 있습니다.
5. 각 국가의 도시, 날짜, 선택 이유, 일정, 활동, 일기, 알게 된 점을 모두 작성하고 대한민국 출발·도착 날짜와 시간을 설정하면 최종 제출할 수 있습니다.
6. 제출 후에는 서버에서도 기록과 사진 수정을 막습니다. 포트폴리오 열람·PDF 저장은 계속 가능합니다.

**학생 세션:** 같은 브라우저의 인증 세션으로 이어서 작성합니다. 로그아웃, 브라우저 저장소 삭제, 다른 기기로 이동하면 닉네임만으로 기존 계정에 다시 로그인할 수 없습니다. 공용 기기에서는 한 학생당 별도 브라우저 프로필을 사용하세요. 한 익명 계정은 한 학급에 참가합니다.

**체험 모드:** 계정 없이 화면과 기능을 확인하는 메모리 기반 체험입니다. 화면 상단에 체험 모드가 표시되며 새로고침/나가기 시 사라집니다. 실제 DB 저장이나 선생님에게 제출하지 않습니다.

## 사진

- JPG, PNG, WebP 입력, 파일당 원본 30MB 이하.
- 업로드 전에 브라우저에서 이미지 디코딩 후 긴 변 1600px 이하로 축소합니다.
- WebP 품질 0.8부터 시작하고 필요하면 크기와 품질을 더 줄여 1MB 이하로 만듭니다.
- 원본 바이트와 메타데이터를 그대로 Storage에 전송하지 않습니다.
- 여행지당 최대 3장. DB 트리거에서도 개수를 제한합니다.
- 비공개 `travel-photos` 버킷, 최대 파일 크기 1MB, MIME `image/webp`.
- 경로: `projectId/studentId/destinationId/photoId.webp`.
- 열람은 1시간짜리 서명 URL입니다. 장시간 열어 둬 이미지가 만료되면 페이지를 다시 열어 주세요.
- Storage와 PostgreSQL은 서로 다른 서비스라 사진 삭제 중 네트워크 오류가 나면 다시 시도해야 합니다. 업로드 후 DB 등록 실패 시 업로드 파일 삭제를 시도합니다.

## 데이터 구조와 보안

`projects → students → trips → destinations → travel_photos`

공통 준비물은 `trips → packing_items`로 연결됩니다.

- `projects.teacher_id`는 교사 Auth UID입니다.
- `students.user_id`는 학생 Auth UID, `students.id`는 데이터 분리용 student_id입니다.
- 모든 업무 테이블에 RLS를 적용합니다.
- 학생은 자신의 행만 조회합니다. 교사는 소유 프로젝트의 학생 명단과 제출 상태를 조회하고 제출된 여행 상세만 읽습니다.
- 학생 참가, 프로젝트 생성, 여행 저장, 제출은 권한을 검사하는 RPC로 처리합니다.
- 클라이언트에 핵심 테이블의 직접 INSERT/UPDATE/DELETE 권한을 주지 않습니다. 소유자·상위 여행 ID를 바꾸는 우회도 막습니다.
- `save_trip`은 트랜잭션 하나에서 모든 여행지와 준비물을 저장합니다. 다른 학생의 여행지 ID를 보내면 전체 저장이 롤백됩니다.
- 제출과 사진 쓰기는 부모 여행 행을 잠가 처리합니다.
- Storage 정책도 프로젝트/학생/여행지 경로와 실제 소유권을 검사합니다.
- 전체 비용은 개별 비용에서 계산하며 별도 `total_cost` 캐시를 두지 않아 불일치를 피합니다.

## PDF

포트폴리오에서 **PDF 다운로드**를 누른 뒤 브라우저 인쇄 창에서 **PDF로 저장 / A4**를 선택합니다. 서버 PDF 생성은 사용하지 않습니다.

- 표지 → 여행지별 챕터 → 디지털 여권 순서입니다.
- 지도는 SVG라 확대·인쇄 시 선명합니다.
- 이미지와 비용 표는 가능한 한 한 페이지에 유지합니다.
- 긴 일기는 필요한 만큼 다음 페이지로 이어지고 제목과 본문이 떨어지는 현상을 줄였습니다.
- 브라우저 머리글/바닥글을 끄면 기록책만 출력됩니다.
- Chrome/Edge의 실제 인쇄 결과는 내용 길이에 따라 달라질 수 있습니다.

## GitHub 업로드 및 Vercel 배포

사용자가 직접 업로드·배포하는 구성을 준비했습니다. 저장소 생성이나 원격 업로드는 수행하지 않았습니다.

1. **이 `world-travel` 폴더의 내용**을 GitHub 저장소 루트로 업로드합니다. 기존 상위 폴더에는 별도 프로젝트가 있으므로 함께 올리지 않습니다.
2. `.env.local`, `node_modules`, `dist`, 테스트 산출물은 업로드하지 않습니다. `.gitignore`에 등록되어 있습니다.
3. Vercel에서 해당 저장소를 Import합니다.
4. Framework Preset: **Vite**, Build Command: **npm run build**, Output Directory: **dist**.
5. 두 환경 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 Production/Preview에 등록합니다.
6. Deploy 후 Supabase의 Site URL도 배포 주소로 변경합니다.
7. 교사 계정으로 프로젝트를 만들고 별도 시크릿 창에서 학생 참가 → 저장 → 사진 업로드 → 제출 → 교사 열람을 확인합니다.

상위 저장소 전체를 올리는 경우 Vercel의 Root Directory를 `world-travel`로 지정해야 합니다.

## 검증

- 기본 구조 → Supabase/API → DB/RLS → 지도 → 여행지 작성·비용·사진 → 포트폴리오 → 통합 UI 순서로 구현하고 빌드를 반복 확인했습니다.
- `npm test`: PGlite(PostgreSQL)에서 학생 간 RLS, 상위 ID 변조, 직접 수정, 사진 개수/경로, 제출 잠금, 담당 교사 열람, 비로그인 RPC 차단을 검사합니다.
- 지도 테스트는 프랑스 등 코드 보정, 폴리곤 방향, 일본/프랑스 중심점, 중복 국가 코드를 검사합니다.
- 브라우저에서 국가 검색·추가, 기록 입력, 비용 합계, 준비물 체크, 사진 압축을 확인했습니다.
- 테스트 사진 2400×1800 → 1600×1200 WebP, 약 11KB.
- 실제 Supabase 로그인/Storage 흐름은 익명 로그인 설정 활성화 후 최종 확인이 필요합니다.

## 지도·국기 출처

- GeoJSON: datasets/geo-countries / Natural Earth. `public/data/README.md` 참조.
- SVG 국기: country-flag-icons. `public/flags/LICENSE.txt` 참조.
- 여권 도장은 별도 국가별 이미지 없이 HTML/CSS로 생성합니다.
- 문화·자연환경·가격·일정을 자동 제공하거나 AI로 추천하지 않습니다.

공식 문서: [Supabase 익명 인증](https://supabase.com/docs/guides/auth/auth-anonymous), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage 보안](https://supabase.com/docs/guides/storage/security/access-control), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite).

### 브라우저 최종 확인

- 체험 제출 후 제목/수정 버튼 비활성화 확인.
- 포트폴리오에 표지, 기록, 디지털 여권·날짜 표시 확인.
- 1024×768 태블릿 가로모드에서 가로 넘침 없음.
- PDF 버튼 호출 시 JS 오류 없음. 내장 미리보기는 운영체제 인쇄 창을 검수할 수 없어 **실제 A4 PDF 파일 출력은 Chrome/Edge에서 최종 확인 필요**.
